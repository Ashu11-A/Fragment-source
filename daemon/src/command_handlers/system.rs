use serde_json::json;

use crate::protocol::types::{RequestMessage, ResponseMessage};

pub async fn ping(request: RequestMessage) -> ResponseMessage {
  let current_timestamp_ms = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .map(|duration| duration.as_millis() as u64)
    .unwrap_or(0);

  ResponseMessage::success(
    request.message_id,
    json!({ "pong": true, "timestamp": current_timestamp_ms }),
  )
}

pub async fn info(request: RequestMessage) -> ResponseMessage {
  ResponseMessage::success(
    request.message_id,
    json!({
      "platform": std::env::consts::OS,
      "arch": std::env::consts::ARCH,
      "daemonVersion": env!("CARGO_PKG_VERSION"),
    }),
  )
}
