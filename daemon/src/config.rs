use crate::error::DaemonError;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    pub debug: bool,
    pub uuid: String,
    pub token_id: String,
    pub token: String,
    pub api: ApiConfig,
    pub system: SystemConfig,
    pub allowed_mounts: Vec<String>,
    pub remote: String,
    /// URL that Docker containers use to reach the Fragment server.
    /// Defaults to `remote` if not set.
    /// On Linux use the Docker network gateway (e.g. http://172.17.0.1:3500)
    /// or host.docker.internal:3500 on Docker Desktop.
    #[serde(default)]
    pub container_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemConfig {
    pub data: String,
}

pub async fn fetch_config(
    panel_url: &str,
    node_id: &str,
    token: &str,
    allow_insecure: bool,
) -> Result<Config, DaemonError> {
    let url = format!("{}/api/node/{}/config?token={}", panel_url, node_id, token);

    let client = if allow_insecure {
        reqwest::Client::builder()
            .danger_accept_invalid_certs(true)
            .build()?
    } else {
        reqwest::Client::new()
    };

    let response = client.get(&url).bearer_auth(token).send().await?;

    let status = response.status();
    if !status.is_success() {
        let text = response.text().await?;
        return Err(format!("Failed to fetch config: {} - {}", status, text).into());
    }

    let panel = parse_panel_url(panel_url)?;
    let port = panel.port_or_known_default().unwrap_or(80);
    let mut config = build_config(token, port, None, Some(panel_url), false)?;
    config.uuid = node_id.to_string();
    Ok(config)
}

pub fn build_config(
    token: &str,
    port: u16,
    ip: Option<&str>,
    panel_url: Option<&str>,
    debug: bool,
) -> Result<Config, DaemonError> {
    let default_panel_url = format!("http://localhost:{}", port);
    let panel_url = panel_url.or(Some(default_panel_url.as_str()));
    let host = match ip.map(str::trim).filter(|host| !host.is_empty()) {
        Some(host) => host.to_string(),
        None => panel_url
            .map(host_from_url)
            .transpose()?
            .unwrap_or_else(|| "localhost".to_string()),
    };

    if host.is_empty() {
        return Err("Daemon host cannot be empty".into());
    }

    let remote = panel_url
        .map(normalize_panel_url)
        .transpose()?
        .unwrap_or_else(|| format!("http://{}:{}", host, port));

    let token_id = token.chars().take(16).collect();

    Ok(Config {
        debug,
        uuid: Uuid::new_v4().to_string(),
        token_id,
        token: token.to_string(),
        api: ApiConfig {
            host,
            port,
        },
        system: SystemConfig {
            data: "/var/lib/fragment/volumes".to_string(),
        },
        allowed_mounts: Vec::new(),
        remote,
        container_url: None,
    })
}

fn host_from_url(panel_url: &str) -> Result<String, DaemonError> {
    let url = parse_panel_url(panel_url)?;
    url.host_str()
        .map(|host| host.to_string())
        .ok_or_else(|| "Panel URL must include a host".into())
}

fn normalize_panel_url(panel_url: &str) -> Result<String, DaemonError> {
    let mut url = parse_panel_url(panel_url)?;
    let path = url.path().trim_end_matches('/').to_string();
    url.set_path(&path);
    Ok(url.to_string().trim_end_matches('/').to_string())
}

fn parse_panel_url(panel_url: &str) -> Result<reqwest::Url, DaemonError> {
    let panel_url = panel_url.trim();
    let with_scheme = if panel_url.starts_with("http://") || panel_url.starts_with("https://") {
        panel_url.to_string()
    } else {
        format!("http://{}", panel_url)
    };

    reqwest::Url::parse(&with_scheme)
        .map_err(|error| DaemonError::Message(format!("Invalid panel URL: {}", error)))
}

pub fn load_config(path: &str) -> Result<Config, DaemonError> {
    let contents = fs::read_to_string(path)?;
    let config: Config = toml::from_str(&contents)?;
    Ok(config)
}

pub fn save_config(path: &str, config: &Config) -> Result<(), DaemonError> {
    if let Some(config_dir) = Path::new(path)
        .parent()
        .filter(|dir| !dir.as_os_str().is_empty() && !dir.exists())
    {
        fs::create_dir_all(config_dir)?;
    }

    let toml_string = toml::to_string_pretty(config)?;
    fs::write(path, toml_string)?;

    Ok(())
}

pub fn config_exists(path: &str) -> bool {
    Path::new(path).exists()
}
