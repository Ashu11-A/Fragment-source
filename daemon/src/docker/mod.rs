use bollard::Docker;
use bollard::models::NetworkCreateRequest;
use bollard::query_parameters::{CreateImageOptionsBuilder, ListNetworksOptionsBuilder};
use futures_util::StreamExt;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::entities::docker;
use crate::error::DaemonError;

pub mod list;
pub mod plugin;
pub mod remove;
pub mod restore;
pub mod start;
pub mod stop;
pub mod utils;

pub const NETWORK_NAME: &str = "fragment-net";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerInstanceRequest {
    pub name: String,
    pub image: String,
    pub ports: Option<HashMap<String, String>>,
    pub env_vars: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerInstanceResponse {
    pub id: i32,
    pub container_id: Option<String>,
    pub name: String,
    pub image: String,
    pub status: String,
    pub ports: Option<String>,
    pub env_vars: Option<String>,
    pub volume_name: Option<String>,
}

pub struct DockerController {
    pub(crate) docker: Docker,
    pub(crate) db: DatabaseConnection,
    pub(crate) panel_url: String,
    /// URL injected as SERVER_URL into every bot container.
    /// Distinct from panel_url because containers cannot use "localhost" to
    /// reach the host — they need the Docker network gateway address.
    pub(crate) container_server_url: String,
}

impl DockerController {
    pub fn new(
        db: DatabaseConnection,
        panel_url: String,
        container_url: Option<String>,
    ) -> Result<Self, DaemonError> {
        let docker = Docker::connect_with_local_defaults().map_err(|error| {
            DaemonError::Message(format!("Failed to connect to Docker: {}", error))
        })?;
        let container_server_url = container_url.unwrap_or_else(|| panel_url.clone());
        Ok(Self { docker, db, panel_url, container_server_url })
    }

    pub async fn ensure_network_exists(&self) -> Result<String, DaemonError> {
        let options = ListNetworksOptionsBuilder::default().build();
        let networks = self.docker.list_networks(Some(options)).await?;
        let exists = networks.iter().any(|network| {
            network
                .name
                .as_ref()
                .is_some_and(|name| name == NETWORK_NAME)
        });

        if !exists {
            let config = NetworkCreateRequest {
                name: NETWORK_NAME.to_string(),
                driver: Some("bridge".to_string()),
                ..Default::default()
            };
            let response = self.docker.create_network(config).await?;
            println!("Created network '{}': {:?}", NETWORK_NAME, response.id);
        } else {
            println!("Network '{}' already exists", NETWORK_NAME);
        }

        Ok(NETWORK_NAME.to_string())
    }

    pub async fn create_instance(
        &self,
        request: DockerInstanceRequest,
    ) -> Result<DockerInstanceResponse, DaemonError> {
        self.ensure_network_exists().await?;

        let DockerInstanceRequest {
            name,
            image,
            ports,
            env_vars,
        } = request;

        println!("Pulling image: {}", image);
        let image_options = CreateImageOptionsBuilder::default()
            .from_image(&image)
            .build();
        let _ = self
            .docker
            .create_image(Some(image_options), None, None)
            .collect::<Vec<_>>()
            .await;

        let env_json = env_vars.as_ref().map(serde_json::to_string).transpose()?;
        let config = utils::build_basic_container_config(&image, env_vars, ports.as_ref());

        let container_id =
            utils::create_and_start_container(&self.docker, NETWORK_NAME, &name, config).await?;

        let ports_json = ports.as_ref().map(serde_json::to_string).transpose()?;
        let instance = docker::ActiveModel {
            container_id: Set(Some(container_id.clone())),
            name: Set(name),
            image: Set(image),
            status: Set("running".to_string()),
            ports: Set(ports_json),
            env_vars: Set(env_json),
            created_at: Set(chrono::Utc::now()),
            updated_at: Set(chrono::Utc::now()),
            ..Default::default()
        };

        let result = instance.insert(&self.db).await?;

        Ok(DockerInstanceResponse {
            id: result.id,
            container_id: result.container_id,
            name: result.name,
            image: result.image,
            status: result.status,
            ports: result.ports,
            env_vars: result.env_vars,
            volume_name: None,
        })
    }

    pub(crate) async fn find_instance_by_id(
        &self,
        id: i32,
    ) -> Result<Option<docker::Model>, DaemonError> {
        docker::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(Into::into)
    }

    pub(crate) async fn find_instance_by_name(
        &self,
        name: &str,
    ) -> Result<Option<docker::Model>, DaemonError> {
        docker::Entity::find()
            .filter(docker::Column::Name.eq(name.to_string()))
            .one(&self.db)
            .await
            .map_err(Into::into)
    }

    pub(crate) async fn update_instance_status(
        &self,
        instance: docker::Model,
        status: &str,
    ) -> Result<(), DaemonError> {
        let mut active: docker::ActiveModel = instance.into();
        active.status = Set(status.to_string());
        active.updated_at = Set(chrono::Utc::now());
        active.update(&self.db).await?;
        Ok(())
    }
}
