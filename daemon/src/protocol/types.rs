use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

// Mensagem recebida do servidor solicitando uma ação Docker
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestMessage {
  pub message_id: String,
  #[serde(rename = "type")]
  pub message_type: String,
  pub action: String,
  pub payload: HashMap<String, Value>,
  pub timestamp: u64,
}

// Resposta enviada ao servidor, correlacionada via message_id
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResponseMessage {
  pub message_id: String,
  #[serde(rename = "type")]
  pub message_type: &'static str,
  pub status: ResponseStatus,
  pub data: Option<Value>,
  pub error: Option<ResponseError>,
  pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ResponseStatus {
  Success,
  Error,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResponseError {
  pub code: String,
  pub message: String,
}

// Mensagem enviada espontaneamente pelo daemon ao servidor (sem correlação com requisição)
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventMessage {
  pub message_id: String,
  #[serde(rename = "type")]
  pub message_type: &'static str,
  pub event: String,
  pub payload: Value,
  pub timestamp: u64,
}

impl ResponseMessage {
  pub fn success(message_id: String, data: Value) -> Self {
    Self {
      message_id,
      message_type: "response",
      status: ResponseStatus::Success,
      data: Some(data),
      error: None,
      timestamp: now_millis(),
    }
  }

  pub fn error(message_id: String, code: &str, message: &str) -> Self {
    Self {
      message_id,
      message_type: "response",
      status: ResponseStatus::Error,
      data: None,
      error: Some(ResponseError {
        code: code.to_string(),
        message: message.to_string(),
      }),
      timestamp: now_millis(),
    }
  }
}

impl EventMessage {
  pub fn new(event: impl Into<String>, payload: Value) -> Self {
    Self {
      message_id: uuid::Uuid::new_v4().to_string(),
      message_type: "event",
      event: event.into(),
      payload,
      timestamp: now_millis(),
    }
  }
}

fn now_millis() -> u64 {
  std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .map(|duration| duration.as_millis() as u64)
    .unwrap_or(0)
}
