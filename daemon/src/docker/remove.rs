use sea_orm::EntityTrait;

use crate::docker::{DockerController, NETWORK_NAME};
use crate::entities::docker::Entity as DockerInstance;
use crate::error::DaemonError;

impl DockerController {
    pub async fn remove_instance(&self, id: i32) -> Result<(), DaemonError> {
        let Some(instance) = self.find_instance_by_id(id).await? else {
            return Ok(());
        };

        if let Some(container_id) = instance.container_id {
            crate::docker::utils::stop_disconnect_remove_container(
                &self.docker,
                NETWORK_NAME,
                &container_id,
            )
            .await?;
        }

        DockerInstance::delete_by_id(id).exec(&self.db).await?;
        Ok(())
    }
}
