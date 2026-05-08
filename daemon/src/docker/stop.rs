use crate::docker::DockerController;
use crate::error::DaemonError;

impl DockerController {
    pub async fn stop_instance(&self, id: i32) -> Result<(), DaemonError> {
        let Some(instance) = self.find_instance_by_id(id).await? else {
            return Ok(());
        };

        self.stop_instance_model(instance).await
    }

    pub async fn stop_instance_by_name(&self, name: &str) -> Result<(), DaemonError> {
        println!("[docker] Looking up instance by name for stop: {}", name);
        let Some(instance) = self.find_instance_by_name(name).await? else {
            println!("[docker] Stop failed: instance '{}' is not tracked", name);
            return Err(DaemonError::Message(format!(
                "Container '{}' is not tracked by this daemon",
                name
            )));
        };

        self.stop_instance_model(instance).await
    }

    async fn stop_instance_model(
        &self,
        instance: crate::entities::docker::Model,
    ) -> Result<(), DaemonError> {
        let Some(container_id) = instance.container_id.clone() else {
            println!(
                "[docker] Stop skipped: instance '{}' has no container id",
                instance.name
            );
            return Ok(());
        };

        println!(
            "[docker] Stopping container '{}' ({})",
            instance.name, container_id
        );
        self.docker.stop_container(&container_id, None).await?;
        self.update_instance_status(instance, "stopped").await?;
        println!("[docker] Container stop completed: {}", container_id);

        Ok(())
    }
}
