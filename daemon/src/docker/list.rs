use sea_orm::EntityTrait;

use crate::docker::{DockerController, DockerInstanceResponse};
use crate::entities::docker::Entity as DockerInstance;
use crate::error::DaemonError;

impl DockerController {
    pub async fn list_instances(&self) -> Result<Vec<DockerInstanceResponse>, DaemonError> {
        let instances = DockerInstance::find().all(&self.db).await?;

        Ok(instances
            .into_iter()
            .map(|instance_model| DockerInstanceResponse {
                id: instance_model.id,
                container_id: instance_model.container_id,
                name: instance_model.name,
                image: instance_model.image,
                status: instance_model.status,
                ports: instance_model.ports,
                env_vars: instance_model.env_vars,
                volume_name: None,
            })
            .collect())
    }
}
