use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use std::collections::HashMap;

use crate::docker::{DockerController, DockerInstanceResponse, NETWORK_NAME};
use crate::entities::docker;
use crate::entities::docker::Entity as DockerInstance;
use crate::error::DaemonError;

impl DockerController {
    pub async fn restore_instances(&self) -> Result<Vec<DockerInstanceResponse>, DaemonError> {
        self.ensure_network_exists().await?;

        let instances = DockerInstance::find()
            .filter(docker::Column::Status.eq("running"))
            .all(&self.db)
            .await?;

        let mut restored_instances = Vec::new();

        for instance in instances {
            if let Some(restored_instance) = self.restore_running_instance(instance).await? {
                restored_instances.push(restored_instance);
            }
        }

        Ok(restored_instances)
    }

    async fn restore_running_instance(
        &self,
        instance: docker::Model,
    ) -> Result<Option<DockerInstanceResponse>, DaemonError> {
        let Some(container_id) = instance.container_id.clone() else {
            return Ok(None);
        };

        if self
            .docker
            .inspect_container(&container_id, None)
            .await
            .is_err()
        {
            return self.recreate_missing_container(instance).await.map(Some);
        }

        self.reconnect_network_best_effort(&container_id).await;

        // Reinicia o container para garantir estado limpo após reinício do daemon.
        // Se DISCORD_TOKEN já está no env do container, o wait-loop termina imediatamente e
        // bun core.js é executado; caso contrário, o evento bot/token/missing será emitido.
        if let Err(restart_error) = self.docker.restart_container(&container_id, None).await {
            eprintln!(
                "Falha ao reiniciar container '{}' após restore: {}",
                instance.name, restart_error
            );
        }

        Ok(Some(to_response(instance)))
    }

    async fn recreate_missing_container(
        &self,
        instance: docker::Model,
    ) -> Result<DockerInstanceResponse, DaemonError> {
        let container_id = instance
            .container_id
            .as_deref()
            .unwrap_or("unknown-container");
        println!("Container {} not found, recreating...", container_id);

        let ports = parse_ports(instance.ports.as_deref())?;
        let raw_env = parse_env_vars(instance.env_vars.as_deref())?;

        // Re-apply runtime env so SERVER_URL and FRAGMENT_BOT_ID are always correct
        // even if the stored record pre-dates a daemon configuration change.
        let bot_id = raw_env
            .iter()
            .find(|v| v.starts_with("FRAGMENT_BOT_ID="))
            .and_then(|v| v["FRAGMENT_BOT_ID=".len()..].parse::<i32>().ok());
        let env_vars = crate::docker::plugin::merge_runtime_env(
            raw_env,
            bot_id,
            &self.container_server_url,
            None,
            None,
        );

        let volume_name = format!("{}-workspace", instance.name);

        // Use the wait-for-token command so the container does not attempt to
        // start core.js without a DISCORD_TOKEN.  The node:bot:token:missing
        // event will fire immediately and trigger initialize_bun_bot to inject
        // the token (at which point this container is replaced with a running one).
        let command = "while [ -z \"$DISCORD_TOKEN\" ]; do echo \"Waiting for Discord token...\"; sleep 2; done && bun core.js";

        let config = crate::docker::utils::build_bun_container_config(
            &instance.image,
            Some(env_vars),
            Some(&ports),
            &volume_name,
            command,
            None,
            None,
        );

        let new_container_id = crate::docker::utils::create_and_start_container(
            &self.docker,
            NETWORK_NAME,
            &instance.name,
            config,
        )
        .await?;

        let mut active: docker::ActiveModel = instance.into();
        active.container_id = Set(Some(new_container_id));
        active.updated_at = Set(chrono::Utc::now());
        let updated = active.update(&self.db).await?;

        Ok(to_response(updated))
    }

    async fn reconnect_network_best_effort(&self, container_id: &str) {
        let reconnect_result = self
            .docker
            .connect_network(
                NETWORK_NAME,
                bollard::models::NetworkConnectRequest {
                    container: container_id.to_string(),
                    endpoint_config: Some(bollard::models::EndpointSettings::default()),
                },
            )
            .await;

        if let Err(error) = reconnect_result {
            eprintln!("Failed to reconnect container to network: {}", error);
        }
    }
}

fn to_response(instance: docker::Model) -> DockerInstanceResponse {
    DockerInstanceResponse {
        id: instance.id,
        container_id: instance.container_id,
        name: instance.name,
        image: instance.image,
        status: instance.status,
        ports: instance.ports,
        env_vars: instance.env_vars,
        volume_name: None,
    }
}

fn parse_ports(serialized: Option<&str>) -> Result<HashMap<String, String>, DaemonError> {
    serialized
        .filter(|raw| !raw.trim().is_empty())
        .map(serde_json::from_str)
        .transpose()?
        .map_or_else(|| Ok(HashMap::new()), Ok)
}

fn parse_env_vars(serialized: Option<&str>) -> Result<Vec<String>, DaemonError> {
    serialized
        .filter(|raw| !raw.trim().is_empty())
        .map(serde_json::from_str)
        .transpose()?
        .map_or_else(|| Ok(Vec::new()), Ok)
}
