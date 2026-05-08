use crate::docker::DockerController;
use crate::error::DaemonError;

impl DockerController {
    pub async fn start_instance(&self, id: i32) -> Result<(), DaemonError> {
        let Some(instance) = self.find_instance_by_id(id).await? else {
            return Ok(());
        };

        self.start_instance_model(instance).await
    }

    pub async fn start_instance_by_name(&self, name: &str) -> Result<(), DaemonError> {
        println!("[docker] Looking up instance by name for start: {}", name);
        let Some(instance) = self.find_instance_by_name(name).await? else {
            println!("[docker] Start failed: instance '{}' is not tracked", name);
            return Err(DaemonError::Message(format!(
                "Container '{}' is not tracked by this daemon",
                name
            )));
        };

        self.start_instance_model(instance).await
    }

    async fn start_instance_model(
        &self,
        instance: crate::entities::docker::Model,
    ) -> Result<(), DaemonError> {
        let Some(container_id) = instance.container_id.clone() else {
            println!(
                "[docker] Start skipped: instance '{}' has no container id",
                instance.name
            );
            return Ok(());
        };

        println!(
            "[docker] Starting container '{}' ({})",
            instance.name, container_id
        );
        self.docker.start_container(&container_id, None).await?;
        self.update_instance_status(instance, "running").await?;
        println!("[docker] Container start completed: {}", container_id);

        Ok(())
    }
}
