use futures_util::future::BoxFuture;
use rust_socketio::Payload;
use rust_socketio::asynchronous::{Client, ClientBuilder};
use serde_json::json;
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::docker::{DockerController, DockerInstanceRequest};
use crate::error::DaemonError;
use crate::models::{
    BotPluginInstallRequest, CreateInstanceRequest, CreateNodeInstanceRequest, InitializeBotRequest,
    InstanceActionRequest, NodeInstanceActionRequest,
};

pub struct SocketController {
    docker: Arc<Mutex<DockerController>>,
    client: Arc<Mutex<Option<Client>>>,
}

impl SocketController {
    pub fn new(docker: DockerController) -> Self {
        Self {
            docker: Arc::new(Mutex::new(docker)),
            client: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn connect(&self, url: &str, token: &str) -> Result<(), DaemonError> {
        let message_callback = {
            let docker = self.docker.clone();
            move |payload: Payload, socket: Client| -> BoxFuture<'static, ()> {
                let docker = docker.clone();
                Box::pin(async move {
                    let Some(value) = extract_payload_value(payload) else {
                        return;
                    };
                    let Some(event) = extract_event_name(&value) else {
                        return;
                    };

                    match event {
                        "create_instance" => {
                            handle_create_instance(docker, socket, &value).await;
                        }
                        "list_instances" => {
                            handle_list_instances(docker, socket).await;
                        }
                        "stop_instance" => {
                            handle_stop_instance(docker, socket, &value).await;
                        }
                        "start_instance" => {
                            handle_start_instance(docker, socket, &value).await;
                        }
                        "remove_instance" => {
                            handle_remove_instance(docker, socket, &value).await;
                        }
                        _ => {}
                    }
                })
            }
        };

        let node_create_callback = {
            let docker = self.docker.clone();
            move |payload: Payload, socket: Client| -> BoxFuture<'static, ()> {
                let docker = docker.clone();
                Box::pin(async move {
                    println!("[socket] Received node:instance:create event");
                    let Some(value) = extract_payload_value(payload) else {
                        println!("[socket] node:instance:create ignored: empty payload");
                        return;
                    };
                    handle_node_instance_create(docker, socket, value).await;
                })
            }
        };

        let bot_initialize_callback = {
            let docker = self.docker.clone();
            move |payload: Payload, socket: Client| -> BoxFuture<'static, ()> {
                let docker = docker.clone();
                Box::pin(async move {
                    let Some(value) = extract_payload_value(payload) else {
                        return;
                    };
                    handle_bot_initialize(docker, socket, value).await;
                })
            }
        };

    let node_action_callback = {
      let docker = self.docker.clone();
      move |payload: Payload, socket: Client| -> BoxFuture<'static, ()> {
        let docker = docker.clone();
        Box::pin(async move {
          println!("[socket] Received node:instance:action event");
          let Some(value) = extract_payload_value(payload) else {
            println!("[socket] node:instance:action ignored: empty payload");
            return;
          };
          handle_node_instance_action(docker, socket, value).await;
        })
      }
    };

    let bot_plugin_install_callback = {
      let docker = self.docker.clone();
      move |payload: Payload, socket: Client| -> BoxFuture<'static, ()> {
        let docker = docker.clone();
        Box::pin(async move {
          println!("[socket] Received node:bot:plugin:install event");
          let Some(value) = extract_payload_value(payload) else {
            println!("[socket] node:bot:plugin:install ignored: empty payload");
            return;
          };
          handle_bot_plugin_install(docker, socket, value).await;
        })
      }
    };

        let connect_callback = |_payload: Payload, _socket: Client| -> BoxFuture<'static, ()> {
            Box::pin(async {
                println!("Connected to Socket.IO server");
            })
        };

        let disconnect_callback = |_payload: Payload, _socket: Client| -> BoxFuture<'static, ()> {
            Box::pin(async {
                println!("Disconnected from Socket.IO server");
            })
        };

        let max_retries = 10;
        let mut attempt = 0;
        let client = loop {
            attempt += 1;
            match ClientBuilder::new(url)
                .namespace("/node")
                .auth(json!({ "token": token }))
                .on("message", message_callback.clone())
                .on("node:bot:initialize", bot_initialize_callback.clone())
                .on("node:instance:create", node_create_callback.clone())
                .on("node:instance:action", node_action_callback.clone())
                .on("node:bot:plugin:install", bot_plugin_install_callback.clone())
                .on("connect", connect_callback)
                .on("disconnect", disconnect_callback)
                .connect()
                .await
            {
                Ok(client) => break client,
                Err(error) => {
                    if attempt >= max_retries {
                        return Err(DaemonError::Message(format!(
                            "Failed to connect to Socket.IO server after {} attempts: {}",
                            max_retries, error
                        )));
                    }
                    let delay = std::time::Duration::from_secs(2u64.pow(attempt.min(6) - 1));
                    println!(
                        "Connection attempt {}/{} failed: {}. Retrying in {:?}...",
                        attempt, max_retries, error, delay
                    );
                    tokio::time::sleep(delay).await;
                }
            }
        };

        *self.client.lock().await = Some(client);
        Ok(())
    }

    pub async fn disconnect(&self) -> Result<(), DaemonError> {
        if let Some(client) = self.client.lock().await.take() {
            client
                .disconnect()
                .await
                .map_err(|error| DaemonError::Message(format!("Disconnect error: {}", error)))?;
        }
        Ok(())
    }
}

fn extract_payload_value(payload: Payload) -> Option<serde_json::Value> {
    match payload {
        Payload::Text(values) => values.into_iter().next(),
        _ => None,
    }
}

fn extract_event_name(value: &serde_json::Value) -> Option<&str> {
    value.get("event").and_then(serde_json::Value::as_str)
}

fn extract_event_data<T: serde::de::DeserializeOwned>(
    value: &serde_json::Value,
) -> Result<T, DaemonError> {
    let data = value
        .get("data")
        .ok_or_else(|| DaemonError::Message("Missing data field".into()))?;
    serde_json::from_value(data.clone()).map_err(Into::into)
}

fn parse_payload<T: serde::de::DeserializeOwned>(
    value: serde_json::Value,
) -> Result<T, DaemonError> {
    serde_json::from_value(value).map_err(Into::into)
}

async fn emit_instance_response(
    socket: &Client,
    event: &str,
    result: Result<serde_json::Value, DaemonError>,
) {
    let payload = match result {
        Ok(data) => json!({ "success": true, "data": data }),
        Err(error) => json!({ "success": false, "error": error.to_string() }),
    };
    emit_or_log(socket, event, payload).await;
}

async fn emit_node_instance_response(
    socket: &Client,
    request_id: &str,
    action: &str,
    result: Result<Option<serde_json::Value>, DaemonError>,
) {
    let payload = match result {
        Ok(Some(data)) => json!({
          "requestId": request_id,
          "ok": true,
          "action": action,
          "message": format!("Instance {} complete", action),
          "instance": data,
        }),
        Ok(None) => json!({
          "requestId": request_id,
          "ok": true,
          "action": action,
          "message": format!("Instance {} complete", action),
        }),
        Err(error) => json!({
          "requestId": request_id,
          "ok": false,
          "action": action,
          "message": format!("Failed to {} instance", action),
          "details": error.to_string(),
        }),
    };
    emit_or_log(socket, "node:instance:result", payload).await;
}

async fn emit_bot_initialize_response(
    socket: &Client,
    request_id: &str,
    bot_id: i32,
    result: Result<(), DaemonError>,
) {
    let payload = match result {
        Ok(()) => json!({
          "requestId": request_id,
          "ok": true,
          "botId": bot_id,
          "message": "Bot initialized",
        }),
        Err(error) => json!({
          "requestId": request_id,
          "ok": false,
          "botId": bot_id,
          "message": "Failed to initialize bot",
          "details": error.to_string(),
        }),
    };
    emit_or_log(socket, "node:bot:initialize:result", payload).await;
}

async fn emit_or_log(socket: &Client, event: &str, payload: serde_json::Value) {
    if let Err(error) = socket.emit(event, payload).await {
        eprintln!("Failed to emit {}: {}", event, error);
    }
}

async fn handle_create_instance(
    docker: Arc<Mutex<DockerController>>,
    socket: Client,
    value: &serde_json::Value,
) {
    let result: Result<serde_json::Value, DaemonError> = async {
        let request: CreateInstanceRequest = extract_event_data(value)?;
        let docker_req = DockerInstanceRequest {
            name: request.name,
            image: request.image,
            ports: request.ports,
            env_vars: request.env_vars,
        };
        let controller = docker.lock().await;
        let instance = controller.create_instance(docker_req).await?;
        Ok(json!(instance))
    }
    .await;

    emit_instance_response(&socket, "instance_created", result).await;
}

async fn handle_list_instances(docker: Arc<Mutex<DockerController>>, socket: Client) {
    let result: Result<serde_json::Value, DaemonError> = async {
        let controller = docker.lock().await;
        let instances = controller.list_instances().await?;
        Ok(json!(instances))
    }
    .await;

    emit_instance_response(&socket, "instances_list", result).await;
}

async fn handle_stop_instance(
    docker: Arc<Mutex<DockerController>>,
    socket: Client,
    value: &serde_json::Value,
) {
    let result: Result<serde_json::Value, DaemonError> = async {
        let request: InstanceActionRequest = extract_event_data(value)?;
        let controller = docker.lock().await;
        controller.stop_instance(request.id).await?;
        Ok(json!({ "id": request.id }))
    }
    .await;

    emit_instance_response(&socket, "instance_stopped", result).await;
}

async fn handle_start_instance(
    docker: Arc<Mutex<DockerController>>,
    socket: Client,
    value: &serde_json::Value,
) {
    let result: Result<serde_json::Value, DaemonError> = async {
        let request: InstanceActionRequest = extract_event_data(value)?;
        let controller = docker.lock().await;
        controller.start_instance(request.id).await?;
        Ok(json!({ "id": request.id }))
    }
    .await;

    emit_instance_response(&socket, "instance_started", result).await;
}

async fn handle_remove_instance(
    docker: Arc<Mutex<DockerController>>,
    socket: Client,
    value: &serde_json::Value,
) {
    let result: Result<serde_json::Value, DaemonError> = async {
        let request: InstanceActionRequest = extract_event_data(value)?;
        let controller = docker.lock().await;
        controller.remove_instance(request.id).await?;
        Ok(json!({ "id": request.id }))
    }
    .await;

    emit_instance_response(&socket, "instance_removed", result).await;
}

async fn handle_node_instance_create(
    docker: Arc<Mutex<DockerController>>,
    socket: Client,
    value: serde_json::Value,
) {
    let request = match parse_payload::<CreateNodeInstanceRequest>(value) {
        Ok(request) => request,
        Err(error) => {
            println!(
                "[socket] node:instance:create invalid payload: {}",
                error
            );
            emit_or_log(
                &socket,
                "node:instance:result",
                json!({
                  "requestId": "unknown",
                  "ok": false,
                  "action": "create",
                  "message": "Invalid node instance request",
                  "details": error.to_string(),
                }),
            )
            .await;
            return;
        }
    };

    let request_id = request.request_id.clone();
    let bot_id = request.bot_id;
    let container_name = request.name.clone();
    let has_token_fetch_url = request.token_fetch_url.is_some();
    let has_discord_token = has_token_fetch_url
        || request.env_vars.as_ref().map(|vars| {
            let has_discord = vars.iter().any(|v| v.starts_with("DISCORD_TOKEN="));
            let has_access = vars.iter().any(|v| v.starts_with("FRAGMENT_ACCESS_TOKEN="));
            has_discord && has_access
        }).unwrap_or(false);

    println!(
        "[socket] Processing node instance create request_id={} action={} name={} bot_id={:?} plugin_id={:?}",
        request_id, request.action, request.name, request.bot_id, request.plugin_id
    );

    if request.action != "create" {
        emit_node_instance_response(&socket, &request_id, &request.action, Ok(None)).await;
        return;
    }

    let result: Result<Option<serde_json::Value>, DaemonError> = async {
        let controller = docker.lock().await;
        let instance = controller.create_bun_instance(request).await?;
        Ok(Some(json!(instance)))
    }
    .await;

    match &result {
        Ok(_) => {
            println!(
                "[socket] Node instance create completed request_id={}",
                request_id
            );
            if let (Some(id), false) = (bot_id, has_discord_token) {
                println!(
                    "[socket] Bot {} container has no DISCORD_TOKEN — notifying server to initialize",
                    id
                );
                emit_or_log(
                    &socket,
                    "node:bot:token:missing",
                    json!({ "botId": id, "containerName": container_name }),
                )
                .await;
            }
        }
        Err(error) => println!(
            "[socket] Node instance create failed request_id={} error={}",
            request_id, error
        ),
    }

    emit_node_instance_response(&socket, &request_id, "create", result).await;
}

async fn handle_node_instance_action(
    docker: Arc<Mutex<DockerController>>,
    socket: Client,
    value: serde_json::Value,
) {
    let request = match parse_payload::<NodeInstanceActionRequest>(value) {
        Ok(request) => request,
        Err(error) => {
            println!(
                "[socket] node:instance:action invalid payload: {}",
                error
            );
            emit_or_log(
                &socket,
                "node:instance:result",
                json!({
                  "requestId": "unknown",
                  "ok": false,
                  "action": "start",
                  "message": "Invalid node instance action request",
                  "details": error.to_string(),
                }),
            )
            .await;
            return;
        }
    };

    let request_id = request.request_id.clone();
    let action = request.action.clone();
    let name = request.name.clone();
    let bot_id = request.bot_id;

    println!(
        "[socket] Processing node instance action request_id={} action={} name={} bot_id={:?}",
        request_id, action, name, bot_id
    );

    let result: Result<Option<serde_json::Value>, DaemonError> = async {
        let controller = docker.lock().await;
        match action.as_str() {
            "start" => {
                println!(
                    "[socket] Starting instance name={} request_id={}",
                    name, request_id
                );
                controller.start_instance_by_name(&name).await?
            }
            "stop" => {
                println!(
                    "[socket] Stopping instance name={} request_id={}",
                    name, request_id
                );
                controller.stop_instance_by_name(&name).await?
            }
            "restart" => {
                println!(
                    "[socket] Restarting instance name={} request_id={}",
                    name, request_id
                );
                controller.stop_instance_by_name(&name).await?;
                controller.start_instance_by_name(&name).await?;
            }
            _ => {
                return Err(DaemonError::Message(format!(
                    "Unsupported node instance action '{}'",
                    action
                )))
            }
        }
        Ok(None)
    }
    .await;

    match &result {
        Ok(_) => {
            println!(
                "[socket] Node instance action completed request_id={} action={} name={}",
                request_id, request.action, request.name
            );
            // After a start/restart, check if the container is missing its Discord token.
            if matches!(action.as_str(), "start" | "restart") {
                if let Some(id) = bot_id {
                    let has_token = container_has_required_tokens(&docker, &name).await;
                    if !has_token {
                        println!(
                            "[socket] Bot {} container started without DISCORD_TOKEN — notifying server",
                            id
                        );
                        emit_or_log(
                            &socket,
                            "node:bot:token:missing",
                            json!({ "botId": id, "containerName": name }),
                        )
                        .await;
                    }
                }
            }
        }
        Err(error) => println!(
            "[socket] Node instance action failed request_id={} action={} name={} error={}",
            request_id, request.action, request.name, error
        ),
    }

    emit_node_instance_response(&socket, &request_id, &request.action, result).await;
}

async fn container_has_required_tokens(docker: &Arc<Mutex<DockerController>>, name: &str) -> bool {
    let controller = docker.lock().await;
    match controller.docker.inspect_container(name, None).await {
        Ok(info) => info
            .config
            .and_then(|c| c.env)
            .map(|env| {
                let has_discord = env.iter().any(|v| v.starts_with("DISCORD_TOKEN="));
                let has_access = env.iter().any(|v| v.starts_with("FRAGMENT_ACCESS_TOKEN="));
                has_discord && has_access
            })
            .unwrap_or(false),
        Err(_) => false,
    }
}

async fn handle_bot_initialize(
    docker: Arc<Mutex<DockerController>>,
    socket: Client,
    value: serde_json::Value,
) {
    let request = match parse_payload::<InitializeBotRequest>(value) {
        Ok(request) => request,
        Err(error) => {
            emit_or_log(
                &socket,
                "node:bot:initialize:result",
                json!({
                  "requestId": "unknown",
                  "ok": false,
                  "botId": 0,
                  "message": "Invalid bot initialization request",
                  "details": error.to_string(),
                }),
            )
            .await;
            return;
        }
    };

    let request_id = request.request_id.clone();
    let bot_id = request.bot_id;
    let container_name = request.container_name.clone();

    println!(
        "[socket] Processing bot initialize request_id={} bot_id={} container_name={}",
        request_id, bot_id, container_name
    );

    let result: Result<(), DaemonError> = async {
        let controller = docker.lock().await;
        controller.initialize_bun_bot(request).await?;
        Ok(())
    }
    .await;

    match &result {
        Ok(()) => println!(
            "[socket] Bot initialize completed request_id={} bot_id={} container_name={}",
            request_id, bot_id, container_name
        ),
        Err(error) => println!(
            "[socket] Bot initialize failed request_id={} bot_id={} container_name={} error={}",
            request_id, bot_id, container_name, error
        ),
    }

    emit_bot_initialize_response(&socket, &request_id, bot_id, result).await;
}

async fn emit_bot_plugin_install_response(
    socket: &Client,
    request_id: &str,
    bot_id: i32,
    result: Result<(), DaemonError>,
) {
    let payload = match result {
        Ok(()) => json!({
          "requestId": request_id,
          "ok": true,
          "botId": bot_id,
          "message": "Plugin installed successfully",
        }),
        Err(error) => json!({
          "requestId": request_id,
          "ok": false,
          "botId": bot_id,
          "message": "Failed to install plugin",
          "details": error.to_string(),
        }),
    };
    emit_or_log(socket, "node:bot:plugin:install:result", payload).await;
}

async fn handle_bot_plugin_install(
    docker: Arc<Mutex<DockerController>>,
    socket: Client,
    value: serde_json::Value,
) {
    let request = match parse_payload::<BotPluginInstallRequest>(value) {
        Ok(request) => request,
        Err(error) => {
            emit_or_log(
                &socket,
                "node:bot:plugin:install:result",
                json!({
                  "requestId": "unknown",
                  "ok": false,
                  "botId": 0,
                  "message": "Invalid bot plugin install request",
                  "details": error.to_string(),
                }),
            )
            .await;
            return;
        }
    };

    let request_id = request.request_id.clone();
    let bot_id = request.bot_id;

    println!(
        "[socket] Processing bot plugin install request_id={} bot_id={} container_name={}",
        request_id, bot_id, request.container_name
    );

    let result: Result<(), DaemonError> = async {
        let controller = docker.lock().await;
        controller
            .install_plugin_on_existing_container(request)
            .await?;
        Ok(())
    }
    .await;

    match &result {
        Ok(()) => println!(
            "[socket] Bot plugin install completed request_id={} bot_id={}",
            request_id, bot_id
        ),
        Err(error) => println!(
            "[socket] Bot plugin install failed request_id={} bot_id={} error={}",
            request_id, bot_id, error
        ),
    }

    emit_bot_plugin_install_response(&socket, &request_id, bot_id, result).await;
}
