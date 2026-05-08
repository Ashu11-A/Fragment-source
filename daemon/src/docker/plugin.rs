use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use bollard::body_full;
use bollard::models::{
    ContainerCreateBody, EndpointSettings, HostConfig, Mount, MountTypeEnum, NetworkConnectRequest,
    NetworkDisconnectRequest, VolumeCreateRequest,
};
use bollard::query_parameters::{
    CreateContainerOptionsBuilder, CreateImageOptionsBuilder, RemoveContainerOptionsBuilder,
    UploadToContainerOptionsBuilder,
};
use futures_util::StreamExt;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use serde::Deserialize;
use std::collections::HashMap;
use std::io::Cursor;
use std::path::{Component, Path, PathBuf};

use crate::docker::{DockerController, DockerInstanceResponse, NETWORK_NAME};
use crate::entities::docker;
use crate::entities::docker::Entity as DockerInstance;
use crate::error::DaemonError;
use crate::models::{BotEnvUpdateRequest, BotPluginInstallRequest, CreateNodeInstanceRequest, InitializeBotRequest, UploadedFile};

const BUN_IMAGE: &str = "oven/bun:latest";
const WORKSPACE_PATH: &str = "/workspace";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NodePluginDeployResponse {
    data: NodePluginDeployPayload,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NodePluginDeployPayload {
    files: Vec<UploadedFile>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NodeBotTokenPayload {
    discord_token: String,
    access_token: Option<String>,
    refresh_token: Option<String>,
}

pub struct BotTokens {
    pub discord_token: String,
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NodePluginBundleResponse {
    plugin: NodePluginBundleInfo,
    bundle: NodePluginBundleData,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NodePluginBundleInfo {
    id: i32,
    name: String,
    #[serde(alias = "creatorId")]
    creator_id: i32,
    version: String,
    #[serde(alias = "minReleaseVersion")]
    min_release_version: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NodePluginBundleData {
    #[serde(alias = "fileName")]
    file_name: String,
    #[serde(alias = "mimeType")]
    mime_type: String,
    #[serde(alias = "contentBase64")]
    content_base64: String,
}

impl DockerController {
    pub async fn create_bun_instance(
        &self,
        request: CreateNodeInstanceRequest,
    ) -> Result<DockerInstanceResponse, DaemonError> {
        self.ensure_network_exists().await?;
        println!(
            "[docker] Creating Bun instance name={} bot_id={:?} plugin_id={:?}",
            request.name, request.bot_id, request.plugin_id
        );

        let image = request
            .image
            .clone()
            .unwrap_or_else(|| BUN_IMAGE.to_string());
        if image != BUN_IMAGE {
            return Err(DaemonError::Message(format!(
                "Node instances must use {}",
                BUN_IMAGE
            )));
        }

        println!("Pulling image: {}", image);
        let image_options = CreateImageOptionsBuilder::default()
            .from_image(&image)
            .build();
        let _ = self
            .docker
            .create_image(Some(image_options), None, None)
            .collect::<Vec<_>>()
            .await;

        let container_name = sanitize_docker_name(&request.name);
        let volume_name = sanitize_docker_name(&format!("{}-workspace", container_name));
        println!(
            "[docker] Prepared instance container_name={} volume_name={}",
            container_name, volume_name
        );

        // Remove any stale container with the same name before creating a fresh one.
        if self.docker.inspect_container(&container_name, None).await.is_ok() {
            println!("[docker] Stale container '{}' found — removing before recreating", container_name);
            let remove_opts = RemoveContainerOptionsBuilder::default().force(true).build();
            self.docker.remove_container(&container_name, Some(remove_opts)).await?;
            println!("[docker] Removed stale container '{}'", container_name);
        }

        // Drop any stale DB record for this name so we don't accumulate duplicates.
        if let Ok(Some(stale)) = self.find_instance_by_name(&container_name).await {
            let mut active: docker::ActiveModel = stale.into();
            active.delete(&self.db).await?;
        }

        let mut labels = HashMap::new();
        labels.insert("fragment.managed".to_string(), "true".to_string());
        labels.insert("fragment.instance".to_string(), container_name.clone());
        if let Some(bot_id) = request.bot_id {
            labels.insert("fragment.bot_id".to_string(), bot_id.to_string());
        }
        if let Some(plugin_id) = request.plugin_id {
            labels.insert("fragment.plugin_id".to_string(), plugin_id.to_string());
        }

        self.docker
            .create_volume(VolumeCreateRequest {
                name: Some(volume_name.clone()),
                driver: Some("local".to_string()),
                labels: Some(labels.clone()),
                ..Default::default()
            })
            .await?;

        let files = if request.plugin_id.is_some() {
            self.fetch_plugin_files_for_deploy(&request).await?
        } else {
            request.files.clone()
        };
        println!(
            "[docker] Seeding instance container_name={} files={}",
            container_name,
            files.len()
        );

        self.seed_volume(&image, &volume_name, &container_name, &files)
            .await?;

        let bot_tokens = if let Some(url) = &request.token_fetch_url {
            println!("[docker] Fetching bot tokens for container_name={}", container_name);
            match self.fetch_bot_token_for_initialize(url).await {
                Ok(tokens) => {
                    println!("[docker] Bot tokens fetched for container_name={}", container_name);
                    Some(tokens)
                }
                Err(err) => {
                    eprintln!("[docker] Failed to fetch bot tokens for container_name={}: {}", container_name, err);
                    None
                }
            }
        } else {
            None
        };

        let env = merge_runtime_env(
            request.env_vars.clone().unwrap_or_default(),
            request.bot_id,
            &self.container_server_url,
            bot_tokens.as_ref().map(|t| t.discord_token.as_str()),
            None, // auth tokens already in env_vars from server
        );
        let command = if bot_tokens.is_some() {
            "bun core.js".to_string()
        } else {
            request.start_command.unwrap_or_else(|| "bun install && bun run start".to_string())
        };

        let mut config = crate::docker::utils::build_bun_container_config(
            &image,
            Some(env),
            request.ports.as_ref(),
            &volume_name,
            &command,
            request.memory_limit_mb,
            request.cpu_limit_percentage,
        );
        config.labels = Some(labels.clone());

        let options = CreateContainerOptionsBuilder::default()
            .name(&container_name)
            .build();

        let container = self.docker.create_container(Some(options), config).await?;
        let container_id = container.id;

        self.docker
            .connect_network(
                NETWORK_NAME,
                NetworkConnectRequest {
                    container: container_id.clone(),
                    endpoint_config: Some(EndpointSettings {
                        ..Default::default()
                    }),
                },
            )
            .await?;

        self.docker.start_container(&container_id, None).await?;
        println!(
            "[docker] Bun instance started container_name={} container_id={}",
            container_name, container_id
        );

        let ports_json = request
            .ports
            .as_ref()
            .map(serde_json::to_string)
            .transpose()?;
        let env_json = request
            .env_vars
            .as_ref()
            .map(serde_json::to_string)
            .transpose()?;

        let instance = docker::ActiveModel {
            container_id: Set(Some(container_id.clone())),
            name: Set(container_name),
            image: Set(image),
            status: Set("running".to_string()),
            ports: Set(ports_json),
            env_vars: Set(env_json),
            created_at: Set(chrono::Utc::now()),
            updated_at: Set(chrono::Utc::now()),
            ..Default::default()
        };

        let result = instance.insert(&self.db).await?;
        println!(
            "[docker] Bun instance tracked id={} name={}",
            result.id, result.name
        );

        Ok(DockerInstanceResponse {
            id: result.id,
            container_id: result.container_id,
            name: result.name,
            image: result.image,
            status: result.status,
            ports: result.ports,
            env_vars: result.env_vars,
            volume_name: Some(volume_name),
        })
    }

    pub async fn initialize_bun_bot(
        &self,
        request: InitializeBotRequest,
    ) -> Result<(), DaemonError> {
        let instance = DockerInstance::find()
            .filter(docker::Column::Name.eq(request.container_name.clone()))
            .one(&self.db)
            .await?
            .ok_or_else(|| {
                DaemonError::Message(format!(
                    "Container '{}' is not tracked by this daemon",
                    request.container_name
                ))
            })?;

        let tokens = self
            .fetch_bot_token_for_initialize(&request.token_fetch_url)
            .await?;

        let existing_env = parse_env_vars(instance.env_vars.as_deref())?;
        let auth_tokens = match (&tokens.access_token, &tokens.refresh_token) {
            (Some(a), Some(r)) => Some((a.as_str(), r.as_str())),
            _ => None,
        };
        let runtime_env = merge_runtime_env(
            existing_env.clone(),
            Some(request.bot_id),
            &self.container_server_url,
            Some(&tokens.discord_token),
            auth_tokens,
        );
        let ports = parse_ports(instance.ports.as_deref())?;

        if let Some(container_id) = &instance.container_id {
            let stop_result = self.docker.stop_container(container_id, None).await;
            log_cleanup_error("stop previous container", stop_result);

            let disconnect_result = self
                .docker
                .disconnect_network(
                    NETWORK_NAME,
                    NetworkDisconnectRequest {
                        container: container_id.clone(),
                        force: Some(true),
                    },
                )
                .await;
            log_cleanup_error("disconnect previous container", disconnect_result);

            let remove_options = RemoveContainerOptionsBuilder::default().force(true).build();
            let remove_result = self
                .docker
                .remove_container(container_id, Some(remove_options))
                .await;
            log_cleanup_error("remove previous container", remove_result);
        }

        let volume_name = sanitize_docker_name(&format!("{}-workspace", request.container_name));
        let config = crate::docker::utils::build_bun_container_config(
            &instance.image,
            Some(runtime_env),
            Some(&ports),
            &volume_name,
            "bun core.js",
            None,
            None,
        );
        let create_options = CreateContainerOptionsBuilder::default()
            .name(&request.container_name)
            .build();
        let replacement = self
            .docker
            .create_container(Some(create_options), config)
            .await?;

        self.docker
            .connect_network(
                NETWORK_NAME,
                NetworkConnectRequest {
                    container: replacement.id.clone(),
                    endpoint_config: Some(EndpointSettings {
                        ..Default::default()
                    }),
                },
            )
            .await?;

        self.docker.start_container(&replacement.id, None).await?;

        let mut active: docker::ActiveModel = instance.into();
        active.container_id = Set(Some(replacement.id));
        active.status = Set("running".to_string());
        active.env_vars = Set(Some(serde_json::to_string(&existing_env)?));
        active.updated_at = Set(chrono::Utc::now());
        active.update(&self.db).await?;

        Ok(())
    }

    async fn seed_volume(
        &self,
        image: &str,
        volume_name: &str,
        container_name: &str,
        files: &[UploadedFile],
    ) -> Result<(), DaemonError> {
        if files.is_empty() {
            return Ok(());
        }

        let seed_name = sanitize_docker_name(&format!("{}-seed", container_name));

        // Remove any stale seed container from a previous (possibly interrupted) run.
        if self.docker.inspect_container(&seed_name, None).await.is_ok() {
            let remove_opts = RemoveContainerOptionsBuilder::default().force(true).build();
            log_cleanup_error(
                "remove stale seed container",
                self.docker.remove_container(&seed_name, Some(remove_opts)).await,
            );
        }

        let seed_config = ContainerCreateBody {
            image: Some(image.to_string()),
            cmd: Some(vec![
                "sh".to_string(),
                "-lc".to_string(),
                "sleep 5".to_string(),
            ]),
            host_config: Some(HostConfig {
                mounts: Some(vec![Mount {
                    target: Some(WORKSPACE_PATH.to_string()),
                    source: Some(volume_name.to_string()),
                    typ: Some(MountTypeEnum::VOLUME),
                    read_only: Some(false),
                    ..Default::default()
                }]),
                ..Default::default()
            }),
            ..Default::default()
        };

        let seed_options = CreateContainerOptionsBuilder::default()
            .name(&seed_name)
            .build();
        let seed_container = self
            .docker
            .create_container(Some(seed_options), seed_config)
            .await?;

        self.docker.start_container(&seed_container.id, None).await?;

        let tarball = build_upload_tar(files)?;
        let upload_options = UploadToContainerOptionsBuilder::default()
            .path(WORKSPACE_PATH)
            .build();
        let upload_result = self
            .docker
            .upload_to_container(
                &seed_container.id,
                Some(upload_options),
                body_full(tarball.into()),
            )
            .await;

        let remove_options = RemoveContainerOptionsBuilder::default().force(true).build();
        let remove_result = self
            .docker
            .remove_container(&seed_container.id, Some(remove_options))
            .await;
        log_cleanup_error("remove seed container", remove_result);

        upload_result?;
        Ok(())
    }
}

impl DockerController {
    async fn fetch_plugin_files_for_deploy(
        &self,
        request: &CreateNodeInstanceRequest,
    ) -> Result<Vec<UploadedFile>, DaemonError> {
        let deploy_url = request.plugin_deploy_url.as_deref().ok_or_else(|| {
            DaemonError::Message("Missing pluginDeployUrl for plugin deployment".to_string())
        })?;

        let response = reqwest::get(deploy_url).await?;
        let status = response.status();
        if !status.is_success() {
            let body = response.text().await?;
            return Err(DaemonError::Message(format!(
                "Plugin deploy download failed: {} - {}",
                status, body
            )));
        }

        let payload: NodePluginDeployResponse = response.json().await?;
        if payload.data.files.is_empty() {
            return Err(DaemonError::Message(
                "Plugin deploy payload did not contain files".to_string(),
            ));
        }

        Ok(payload.data.files)
    }

    async fn fetch_bot_token_for_initialize(
        &self,
        token_fetch_url: &str,
    ) -> Result<BotTokens, DaemonError> {
        let response = reqwest::get(token_fetch_url).await?;
        let status = response.status();
        if !status.is_success() {
            let body = response.text().await?;
            return Err(DaemonError::Message(format!(
                "Bot token fetch failed: {} - {}",
                status, body
            )));
        }

        let payload: NodeBotTokenPayload = response.json().await?;
        let discord_token = payload.discord_token.trim().to_string();
        if discord_token.is_empty() {
            return Err(DaemonError::Message(
                "Bot token fetch returned an empty discord token".to_string(),
            ));
        }

        Ok(BotTokens {
            discord_token,
            access_token: payload.access_token.filter(|t| !t.trim().is_empty()),
            refresh_token: payload.refresh_token.filter(|t| !t.trim().is_empty()),
        })
    }

    pub async fn install_plugin_on_existing_container(
        &self,
        request: BotPluginInstallRequest,
    ) -> Result<(), DaemonError> {
        println!(
            "[docker] Installing plugin on existing container name={} bot_id={}",
            request.container_name, request.bot_id
        );

        let instance = DockerInstance::find()
            .filter(docker::Column::Name.eq(request.container_name.clone()))
            .one(&self.db)
            .await?
            .ok_or_else(|| {
                DaemonError::Message(format!(
                    "Container '{}' is not tracked by this daemon",
                    request.container_name
                ))
            })?;

        let container_id = instance.container_id.as_deref().ok_or_else(|| {
            DaemonError::Message(format!(
                "Container '{}' has no associated container ID",
                request.container_name
            ))
        })?;

        println!(
            "[docker] Found existing container name={} container_id={}",
            request.container_name, container_id
        );

        let mut files = self
            .fetch_plugin_bundle_for_install(&request.plugin_deploy_url)
            .await?;

        // Write plugin environment variables into a .env file so core/dotenv loads them on restart.
        if let Some(env_vars) = request.env_vars {
            let dotenv_content = env_vars.join("\n");
            files.push(UploadedFile {
                path: ".env".to_string(),
                content_base64: STANDARD.encode(dotenv_content.as_bytes()),
            });
        }

        let volume_name = sanitize_docker_name(&format!("{}-workspace", request.container_name));
        println!(
            "[docker] Seeding plugin into volume name={} files={}",
            volume_name,
            files.len()
        );

        self.seed_volume(&instance.image, &volume_name, &request.container_name, &files)
            .await?;

        println!(
            "[docker] Restarting container name={} container_id={}",
            request.container_name, container_id
        );

        self.docker.stop_container(container_id, None).await?;
        self.docker.start_container(container_id, None).await?;

        println!(
            "[docker] Plugin install complete name={} bot_id={}",
            request.container_name, request.bot_id
        );

        Ok(())
    }

    /// Updates a running container's environment variables by recreating the
    /// container with the new env set injected as Docker ENV (not a .env file).
    /// The daemon DB is updated so future `bot/initialize` calls preserve them.
    pub async fn update_bot_env(
        &self,
        request: BotEnvUpdateRequest,
    ) -> Result<(), DaemonError> {
        println!(
            "[docker] Updating env vars for container name={} bot_id={}",
            request.container_name, request.bot_id
        );

        let instance = DockerInstance::find()
            .filter(docker::Column::Name.eq(request.container_name.clone()))
            .one(&self.db)
            .await?
            .ok_or_else(|| {
                DaemonError::Message(format!(
                    "Container '{}' is not tracked by this daemon",
                    request.container_name
                ))
            })?;

        println!(
            "[docker] bot/env/update: received {} env var(s): {:?}",
            request.env_vars.len(),
            request.env_vars
        );

        let tokens = self
            .fetch_bot_token_for_initialize(&request.token_fetch_url)
            .await?;

        println!(
            "[docker] bot/env/update: token fetch ok, discord_token_len={}, has_access={}, has_refresh={}",
            tokens.discord_token.len(),
            tokens.access_token.is_some(),
            tokens.refresh_token.is_some()
        );

        let auth_tokens = match (&tokens.access_token, &tokens.refresh_token) {
            (Some(a), Some(r)) => Some((a.as_str(), r.as_str())),
            _ => None,
        };

        let runtime_env = merge_runtime_env(
            request.env_vars.clone(),
            Some(request.bot_id),
            &self.container_server_url,
            Some(&tokens.discord_token),
            auth_tokens,
        );

        println!(
            "[docker] bot/env/update: final runtime_env ({} vars): {:?}",
            runtime_env.len(),
            runtime_env
        );

        let ports = parse_ports(instance.ports.as_deref())?;
        let volume_name = sanitize_docker_name(&format!("{}-workspace", request.container_name));

        if let Some(container_id) = &instance.container_id {
            let stop_result = self.docker.stop_container(container_id, None).await;
            log_cleanup_error("stop container for env update", stop_result);

            let disconnect_result = self
                .docker
                .disconnect_network(
                    NETWORK_NAME,
                    NetworkDisconnectRequest {
                        container: container_id.clone(),
                        force: Some(true),
                    },
                )
                .await;
            log_cleanup_error("disconnect container for env update", disconnect_result);

            let remove_options = RemoveContainerOptionsBuilder::default().force(true).build();
            let remove_result = self
                .docker
                .remove_container(container_id, Some(remove_options))
                .await;
            log_cleanup_error("remove container for env update", remove_result);
        }

        let config = crate::docker::utils::build_bun_container_config(
            &instance.image,
            Some(runtime_env),
            Some(&ports),
            &volume_name,
            "bun core.js",
            None,
            None,
        );
        let create_options = CreateContainerOptionsBuilder::default()
            .name(&request.container_name)
            .build();
        let replacement = self.docker.create_container(Some(create_options), config).await?;

        self.docker
            .connect_network(
                NETWORK_NAME,
                NetworkConnectRequest {
                    container: replacement.id.clone(),
                    endpoint_config: Some(EndpointSettings {
                        ..Default::default()
                    }),
                },
            )
            .await?;

        self.docker.start_container(&replacement.id, None).await?;

        // Persist env_vars (without token) so bot/initialize merges them correctly.
        let mut active: docker::ActiveModel = instance.into();
        active.container_id = Set(Some(replacement.id));
        active.status = Set("running".to_string());
        active.env_vars = Set(Some(serde_json::to_string(&request.env_vars)?));
        active.updated_at = Set(chrono::Utc::now());
        active.update(&self.db).await?;

        println!(
            "[docker] Env vars updated and container restarted name={}",
            request.container_name
        );

        Ok(())
    }

    async fn fetch_plugin_bundle_for_install(
        &self,
        deploy_url: &str,
    ) -> Result<Vec<UploadedFile>, DaemonError> {
        let response = reqwest::get(deploy_url).await?;
        let status = response.status();
        if !status.is_success() {
            let body = response.text().await?;
            return Err(DaemonError::Message(format!(
                "Plugin deploy download failed: {} - {}",
                status, body
            )));
        }

        let payload: NodePluginBundleResponse = response.json().await?;
        if payload.bundle.content_base64.is_empty() {
            return Err(DaemonError::Message(
                "Plugin deploy payload did not contain bundle content".to_string(),
            ));
        }

        Ok(vec![UploadedFile {
            path: payload.bundle.file_name,
            content_base64: payload.bundle.content_base64,
        }])
    }
}

fn parse_env_vars(serialized: Option<&str>) -> Result<Vec<String>, DaemonError> {
    serialized
        .filter(|raw| !raw.trim().is_empty())
        .map(serde_json::from_str)
        .transpose()?
        .map_or_else(|| Ok(Vec::new()), Ok)
}

fn parse_ports(serialized: Option<&str>) -> Result<HashMap<String, String>, DaemonError> {
    serialized
        .filter(|raw| !raw.trim().is_empty())
        .map(serde_json::from_str)
        .transpose()?
        .map_or_else(|| Ok(HashMap::new()), Ok)
}

pub(crate) fn merge_runtime_env(
    mut env: Vec<String>,
    bot_id: Option<i32>,
    panel_url: &str,
    discord_token: Option<&str>,
    auth_tokens: Option<(&str, &str)>,
) -> Vec<String> {
    env.retain(|entry| {
        !entry.starts_with("DISCORD_TOKEN=")
            && !entry.starts_with("SERVER_URL=")
            && !entry.starts_with("FRAGMENT_BOT_ID=")
            && !entry.starts_with("FRAGMENT_RUN=")
            && (auth_tokens.is_none()
                || (!entry.starts_with("FRAGMENT_ACCESS_TOKEN=")
                    && !entry.starts_with("FRAGMENT_REFRESH_TOKEN=")))
    });

    env.push(format!("SERVER_URL={}", panel_url));
    env.push("FRAGMENT_RUN=1".to_string());

    if let Some(id) = bot_id {
        env.push(format!("FRAGMENT_BOT_ID={}", id));
    }

    if let Some(token) = discord_token {
        env.push(format!("DISCORD_TOKEN={}", token));
    }

    if let Some((access, refresh)) = auth_tokens {
        env.push(format!("FRAGMENT_ACCESS_TOKEN={}", access));
        env.push(format!("FRAGMENT_REFRESH_TOKEN={}", refresh));
    }

    env
}

fn build_upload_tar(files: &[UploadedFile]) -> Result<Vec<u8>, DaemonError> {
    let mut archive = tar::Builder::new(Vec::new());

    for file in files {
        let path = validate_upload_path(&file.path)?;
        let bytes = STANDARD
            .decode(&file.content_base64)
            .map_err(|error| DaemonError::Message(format!("Invalid base64 payload: {}", error)))?;
        let mut header = tar::Header::new_gnu();
        header.set_size(bytes.len() as u64);
        header.set_mode(0o644);
        header.set_cksum();
        archive.append_data(&mut header, path, Cursor::new(bytes))?;
    }

    archive.finish()?;
    Ok(archive.into_inner()?)
}

fn validate_upload_path(path: &str) -> Result<PathBuf, DaemonError> {
    if path.contains('\\') || path.contains('\0') {
        return Err(DaemonError::Message("Invalid upload path".to_string()));
    }

    let parsed = Path::new(path);
    let safe = parsed
        .components()
        .all(|component| matches!(component, Component::Normal(_)));

    if !safe {
        return Err(DaemonError::Message(
            "Upload paths must be relative and cannot contain parent directories".to_string(),
        ));
    }

    Ok(parsed.to_path_buf())
}

fn log_cleanup_error(action: &str, result: Result<(), bollard::errors::Error>) {
    if let Err(error) = result {
        eprintln!("Cleanup step failed ({}): {}", action, error);
    }
}

fn sanitize_docker_name(input: &str) -> String {
    let collapsed = input
        .to_ascii_lowercase()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '-' || character == '_' {
                character
            } else {
                '-'
            }
        })
        .fold(String::new(), |mut name, character| {
            if character != '-' || !name.ends_with('-') {
                name.push(character);
            }
            name
        });

    let trimmed = collapsed.trim_matches('-');
    if trimmed.is_empty() {
        "fragment-instance".to_string()
    } else {
        trimmed.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_upload_path_allows_relative_nested_paths() {
        let path = validate_upload_path("src/index.ts").expect("path should be valid");
        assert_eq!(path, PathBuf::from("src/index.ts"));
    }

    #[test]
    fn validate_upload_path_rejects_parent_paths() {
        assert!(validate_upload_path("../secret").is_err());
        assert!(validate_upload_path("src/../../secret").is_err());
        assert!(validate_upload_path("/absolute/path").is_err());
    }

    #[test]
    fn merge_runtime_env_replaces_existing_token() {
        let env = vec![
            "FRAGMENT_BOT_ID=2".to_string(),
            "DISCORD_TOKEN=old-token".to_string(),
        ];

        let merged = merge_runtime_env(env, Some(2), "http://localhost:3500", Some("new-token"), None);
        assert_eq!(
            merged,
            vec![
                "SERVER_URL=http://localhost:3500".to_string(),
                "FRAGMENT_BOT_ID=2".to_string(),
                "DISCORD_TOKEN=new-token".to_string()
            ]
        );
    }
}
