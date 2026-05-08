use bollard::Docker;
use bollard::models::{
    ContainerCreateBody, EndpointSettings, HostConfig, Mount, MountTypeEnum, NetworkConnectRequest,
    NetworkDisconnectRequest, PortBinding, PortMap,
};
use bollard::query_parameters::{CreateContainerOptionsBuilder, RemoveContainerOptionsBuilder};
use std::collections::HashMap;

use crate::error::DaemonError;

pub fn build_port_bindings(ports: Option<&HashMap<String, String>>) -> PortMap {
    ports
        .map(|ports_map| {
            ports_map
                .iter()
                .map(|(container_port, host_port)| {
                    (
                        container_port.clone(),
                        Some(vec![PortBinding {
                            host_ip: Some("0.0.0.0".to_string()),
                            host_port: Some(host_port.clone()),
                        }]),
                    )
                })
                .collect()
        })
        .unwrap_or_default()
}

pub async fn create_and_start_container(
    docker: &Docker,
    network_name: &str,
    container_name: &str,
    config: ContainerCreateBody,
) -> Result<String, DaemonError> {
    let options = CreateContainerOptionsBuilder::default()
        .name(container_name)
        .build();

    let container = docker.create_container(Some(options), config).await?;
    let container_id = container.id;

    docker
        .connect_network(
            network_name,
            NetworkConnectRequest {
                container: container_id.clone(),
                endpoint_config: Some(EndpointSettings::default()),
            },
        )
        .await?;

    docker.start_container(&container_id, None).await?;

    Ok(container_id)
}

pub async fn stop_disconnect_remove_container(
    docker: &Docker,
    network_name: &str,
    container_id: &str,
) -> Result<(), DaemonError> {
    docker.stop_container(container_id, None).await?;

    docker
        .disconnect_network(
            network_name,
            NetworkDisconnectRequest {
                container: container_id.to_string(),
                force: Some(true),
            },
        )
        .await?;

    let remove_options = RemoveContainerOptionsBuilder::default().force(true).build();
    docker
        .remove_container(container_id, Some(remove_options))
        .await?;

    Ok(())
}

pub fn build_basic_container_config(
    image: &str,
    env_vars: Option<Vec<String>>,
    ports: Option<&HashMap<String, String>>,
) -> ContainerCreateBody {
    ContainerCreateBody {
        image: Some(image.to_string()),
        env: env_vars,
        host_config: Some(HostConfig {
            port_bindings: Some(build_port_bindings(ports)),
            ..Default::default()
        }),
        ..Default::default()
    }
}

pub fn build_bun_container_config(
    image: &str,
    env_vars: Option<Vec<String>>,
    ports: Option<&HashMap<String, String>>,
    volume_name: &str,
    command: &str,
    memory_limit_mb: Option<i64>,
    cpu_limit_percentage: Option<i64>,
) -> ContainerCreateBody {
    ContainerCreateBody {
        image: Some(image.to_string()),
        env: env_vars,
        working_dir: Some("/app".to_string()),
        entrypoint: Some(vec![]),
        cmd: Some(vec![
            "sh".to_string(),
            "-lc".to_string(),
            command.to_string(),
        ]),
        host_config: Some(HostConfig {
            port_bindings: Some(build_port_bindings(ports)),
            mounts: Some(vec![Mount {
                target: Some("/app".to_string()),
                source: Some(volume_name.to_string()),
                typ: Some(MountTypeEnum::VOLUME),
                read_only: Some(false),
                ..Default::default()
            }]),
            memory: memory_limit_mb.map(|mb| mb * 1024 * 1024),
            cpu_period: cpu_limit_percentage.map(|_| 100_000),
            cpu_quota: cpu_limit_percentage.map(|percentage| 100_000 * percentage / 100),
            ..Default::default()
        }),
        ..Default::default()
    }
}
