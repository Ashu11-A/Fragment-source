use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInstanceRequest {
    pub request_id: Option<String>,
    pub name: String,
    pub image: String,
    pub ports: Option<HashMap<String, String>>,
    pub env_vars: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadedFile {
    pub path: String,
    pub content_base64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNodeInstanceRequest {
    pub request_id: String,
    pub action: String,
    pub name: String,
    pub image: Option<String>,
    pub bot_id: Option<i32>,
    pub plugin_id: Option<i32>,
    pub plugin_deploy_url: Option<String>,
    pub token_fetch_url: Option<String>,
    pub start_command: Option<String>,
    pub env_vars: Option<Vec<String>>,
    pub ports: Option<HashMap<String, String>>,
    pub memory_limit_mb: Option<i64>,
    pub cpu_limit_percentage: Option<i64>,
    #[serde(default)]
    pub files: Vec<UploadedFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeInstanceActionRequest {
    pub request_id: String,
    pub action: String,
    pub name: String,
    pub bot_id: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitializeBotRequest {
    pub request_id: String,
    pub bot_id: i32,
    pub container_name: String,
    pub token_fetch_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstanceActionRequest {
    pub id: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BotPluginInstallRequest {
    pub request_id: String,
    pub bot_id: i32,
    pub container_name: String,
    pub plugin_deploy_url: String,
    pub env_vars: Option<Vec<String>>,
}

/// Updates a container's env vars by recreating it with the full env set
/// (base + plugin) injected as Docker ENV, then fetching the Discord token.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BotEnvUpdateRequest {
    pub request_id: String,
    pub bot_id: i32,
    pub container_name: String,
    /// Complete env var set (FRAGMENT_LANGUAGE, plugin vars, etc.) excluding
    /// runtime-injected ones (SERVER_URL, FRAGMENT_BOT_ID, DISCORD_TOKEN,
    /// FRAGMENT_ACCESS_TOKEN, FRAGMENT_REFRESH_TOKEN) which merge_runtime_env adds.
    pub env_vars: Vec<String>,
    pub token_fetch_url: String,
}
