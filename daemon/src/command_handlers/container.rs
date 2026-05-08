use std::sync::Arc;

use bollard::query_parameters::LogsOptions;
use bollard::Docker;
use futures_util::StreamExt;
use serde_json::{json, Value};
use tokio::sync::Mutex;

use crate::command_handlers::DispatchResult;
use crate::docker::DockerController;
use crate::models::{BotEnvUpdateRequest, BotPluginInstallRequest, CreateNodeInstanceRequest, InitializeBotRequest};
use crate::protocol::types::{EventMessage, RequestMessage, ResponseMessage};

pub async fn list_instances(
  request: RequestMessage,
  docker: Arc<Mutex<DockerController>>,
) -> ResponseMessage {
  let controller = docker.lock().await;
  match controller.list_instances().await {
    Ok(instances) => ResponseMessage::success(request.message_id, json!({ "instances": instances })),
    Err(list_error) => {
      ResponseMessage::error(request.message_id, "LIST_INSTANCES_ERROR", &list_error.to_string())
    }
  }
}

pub async fn create_instance(
  request: RequestMessage,
  docker: Arc<Mutex<DockerController>>,
) -> DispatchResult {
  let node_request = match deserialize_payload::<CreateNodeInstanceRequest>(&request.payload) {
    Ok(parsed) => parsed,
    Err(error_message) => {
      return DispatchResult::simple(ResponseMessage::error(
        request.message_id,
        "INVALID_PAYLOAD",
        &error_message,
      ))
    }
  };

  let bot_id = node_request.bot_id;
  let container_name = node_request.name.clone();
  // Sem token_fetch_url, o container inicia no modo wait; será necessário injetar o token depois
  let will_need_token = node_request.token_fetch_url.is_none() && bot_id.is_some();

  let controller = docker.lock().await;
  match controller.create_bun_instance(node_request).await {
    Ok(created_instance) => {
      let response = ResponseMessage::success(request.message_id, json!(created_instance));
      let events = if will_need_token
        && !container_has_required_tokens(&controller.docker, &container_name).await
      {
        vec![EventMessage::new(
          "bot/token/missing",
          json!({ "botId": bot_id, "containerName": container_name }),
        )]
      } else {
        vec![]
      };
      DispatchResult { response, events }
    }
    Err(create_error) => DispatchResult::simple(ResponseMessage::error(
      request.message_id,
      "CREATE_INSTANCE_ERROR",
      &create_error.to_string(),
    )),
  }
}

pub async fn start_instance(
  request: RequestMessage,
  docker: Arc<Mutex<DockerController>>,
) -> DispatchResult {
  let instance_name = match extract_string_field(&request.payload, "name") {
    Some(name) => name,
    None => {
      return DispatchResult::simple(ResponseMessage::error(
        request.message_id,
        "MISSING_FIELD",
        "Campo 'name' é obrigatório para iniciar uma instância",
      ))
    }
  };
  let bot_id = request.payload.get("botId").and_then(Value::as_i64).map(|id| id as i32);

  let controller = docker.lock().await;
  match controller.start_instance_by_name(&instance_name).await {
    Ok(_) => {
      let response =
        ResponseMessage::success(request.message_id, json!({ "name": instance_name, "started": true }));
      let events = if bot_id.is_some()
        && !container_has_required_tokens(&controller.docker, &instance_name).await
      {
        vec![EventMessage::new(
          "bot/token/missing",
          json!({ "botId": bot_id, "containerName": instance_name }),
        )]
      } else {
        vec![]
      };
      DispatchResult { response, events }
    }
    Err(start_error) => DispatchResult::simple(ResponseMessage::error(
      request.message_id,
      "START_INSTANCE_ERROR",
      &start_error.to_string(),
    )),
  }
}

pub async fn stop_instance(
  request: RequestMessage,
  docker: Arc<Mutex<DockerController>>,
) -> ResponseMessage {
  let instance_name = match extract_string_field(&request.payload, "name") {
    Some(name) => name,
    None => {
      return ResponseMessage::error(
        request.message_id,
        "MISSING_FIELD",
        "Campo 'name' é obrigatório para parar uma instância",
      )
    }
  };

  let controller = docker.lock().await;
  match controller.stop_instance_by_name(&instance_name).await {
    Ok(_) => {
      ResponseMessage::success(request.message_id, json!({ "name": instance_name, "stopped": true }))
    }
    Err(stop_error) => {
      ResponseMessage::error(request.message_id, "STOP_INSTANCE_ERROR", &stop_error.to_string())
    }
  }
}

pub async fn restart_instance(
  request: RequestMessage,
  docker: Arc<Mutex<DockerController>>,
) -> DispatchResult {
  let instance_name = match extract_string_field(&request.payload, "name") {
    Some(name) => name,
    None => {
      return DispatchResult::simple(ResponseMessage::error(
        request.message_id,
        "MISSING_FIELD",
        "Campo 'name' é obrigatório para reiniciar uma instância",
      ))
    }
  };
  let bot_id = request.payload.get("botId").and_then(Value::as_i64).map(|id| id as i32);

  let controller = docker.lock().await;
  if let Err(stop_error) = controller.stop_instance_by_name(&instance_name).await {
    return DispatchResult::simple(ResponseMessage::error(
      request.message_id,
      "STOP_INSTANCE_ERROR",
      &stop_error.to_string(),
    ));
  }
  match controller.start_instance_by_name(&instance_name).await {
    Ok(_) => {
      let response = ResponseMessage::success(
        request.message_id,
        json!({ "name": instance_name, "restarted": true }),
      );
      let events = if bot_id.is_some()
        && !container_has_required_tokens(&controller.docker, &instance_name).await
      {
        vec![EventMessage::new(
          "bot/token/missing",
          json!({ "botId": bot_id, "containerName": instance_name }),
        )]
      } else {
        vec![]
      };
      DispatchResult { response, events }
    }
    Err(start_error) => DispatchResult::simple(ResponseMessage::error(
      request.message_id,
      "START_INSTANCE_ERROR",
      &start_error.to_string(),
    )),
  }
}

pub async fn remove_instance(
  request: RequestMessage,
  docker: Arc<Mutex<DockerController>>,
) -> ResponseMessage {
  let instance_id = match request.payload.get("id").and_then(Value::as_i64) {
    Some(numeric_id) => numeric_id as i32,
    None => {
      return ResponseMessage::error(
        request.message_id,
        "MISSING_FIELD",
        "Campo 'id' (inteiro) é obrigatório para remover uma instância",
      )
    }
  };

  let controller = docker.lock().await;
  match controller.remove_instance(instance_id).await {
    Ok(()) => ResponseMessage::success(request.message_id, json!({ "id": instance_id, "removed": true })),
    Err(remove_error) => {
      ResponseMessage::error(request.message_id, "REMOVE_INSTANCE_ERROR", &remove_error.to_string())
    }
  }
}

pub async fn fetch_logs(
  request: RequestMessage,
  docker: Arc<Mutex<DockerController>>,
) -> ResponseMessage {
  let container_name = match extract_string_field(&request.payload, "name") {
    Some(name) => name,
    None => {
      return ResponseMessage::error(
        request.message_id,
        "MISSING_FIELD",
        "Campo 'name' é obrigatório para buscar logs",
      )
    }
  };

  let tail_line_count = request.payload.get("tail").and_then(Value::as_u64).unwrap_or(100);

  let log_options = LogsOptions {
    stdout: true,
    stderr: true,
    tail: tail_line_count.to_string(),
    ..Default::default()
  };

  let controller = docker.lock().await;
  let mut log_stream = controller.docker.logs(&container_name, Some(log_options));
  let mut accumulated_output = Vec::<String>::new();

  while let Some(log_chunk) = log_stream.next().await {
    match log_chunk {
      Ok(log_output) => accumulated_output.push(log_output.to_string()),
      Err(stream_error) => {
        return ResponseMessage::error(request.message_id, "FETCH_LOGS_ERROR", &stream_error.to_string())
      }
    }
  }

  ResponseMessage::success(
    request.message_id,
    json!({ "name": container_name, "logs": accumulated_output.join("") }),
  )
}

pub async fn initialize_bot(
  request: RequestMessage,
  docker: Arc<Mutex<DockerController>>,
) -> ResponseMessage {
  let bot_request = match deserialize_payload::<InitializeBotRequest>(&request.payload) {
    Ok(parsed) => parsed,
    Err(error_message) => {
      return ResponseMessage::error(request.message_id, "INVALID_PAYLOAD", &error_message)
    }
  };

  let controller = docker.lock().await;
  match controller.initialize_bun_bot(bot_request).await {
    Ok(()) => ResponseMessage::success(request.message_id, json!({ "initialized": true })),
    Err(init_error) => {
      ResponseMessage::error(request.message_id, "BOT_INIT_ERROR", &init_error.to_string())
    }
  }
}

pub async fn install_plugin(
  request: RequestMessage,
  docker: Arc<Mutex<DockerController>>,
) -> ResponseMessage {
  let plugin_request = match deserialize_payload::<BotPluginInstallRequest>(&request.payload) {
    Ok(parsed) => parsed,
    Err(error_message) => {
      return ResponseMessage::error(request.message_id, "INVALID_PAYLOAD", &error_message)
    }
  };

  let controller = docker.lock().await;
  match controller.install_plugin_on_existing_container(plugin_request).await {
    Ok(()) => ResponseMessage::success(request.message_id, json!({ "installed": true })),
    Err(install_error) => ResponseMessage::error(
      request.message_id,
      "PLUGIN_INSTALL_ERROR",
      &install_error.to_string(),
    ),
  }
}

pub async fn update_bot_env(
  request: RequestMessage,
  docker: Arc<Mutex<DockerController>>,
) -> ResponseMessage {
  let env_request = match deserialize_payload::<BotEnvUpdateRequest>(&request.payload) {
    Ok(parsed) => parsed,
    Err(error_message) => {
      return ResponseMessage::error(request.message_id, "INVALID_PAYLOAD", &error_message)
    }
  };

  let controller = docker.lock().await;
  match controller.update_bot_env(env_request).await {
    Ok(()) => ResponseMessage::success(request.message_id, json!({ "updated": true })),
    Err(update_error) => ResponseMessage::error(
      request.message_id,
      "ENV_UPDATE_ERROR",
      &update_error.to_string(),
    ),
  }
}

// Verifica se o container possui DISCORD_TOKEN e FRAGMENT_ACCESS_TOKEN não vazios
async fn container_has_required_tokens(docker: &Docker, container_name: &str) -> bool {
  match docker.inspect_container(container_name, None).await {
    Ok(info) => info
      .config
      .and_then(|config| config.env)
      .map(|env_vars| {
        let has_discord = env_vars
          .iter()
          .any(|entry| entry.starts_with("DISCORD_TOKEN=") && entry.len() > "DISCORD_TOKEN=".len());
        let has_access = env_vars
          .iter()
          .any(|entry| entry.starts_with("FRAGMENT_ACCESS_TOKEN=") && entry.len() > "FRAGMENT_ACCESS_TOKEN=".len());
        has_discord && has_access
      })
      .unwrap_or(false),
    Err(_) => false,
  }
}

fn extract_string_field(
  payload: &std::collections::HashMap<String, Value>,
  field_name: &str,
) -> Option<String> {
  payload.get(field_name)?.as_str().map(String::from)
}

fn deserialize_payload<T: serde::de::DeserializeOwned>(
  payload: &std::collections::HashMap<String, Value>,
) -> Result<T, String> {
  let payload_value = Value::Object(
    payload.iter().map(|(key, value)| (key.clone(), value.clone())).collect(),
  );
  serde_json::from_value(payload_value)
    .map_err(|deserialization_error| format!("Payload inválido: {}", deserialization_error))
}
