pub mod container;
pub mod system;

use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::warn;

use crate::docker::DockerController;
use crate::protocol::types::{EventMessage, RequestMessage, ResponseMessage};

pub struct DispatchResult {
  pub response: ResponseMessage,
  // Eventos a enviar ao servidor após a resposta (ex: bot/token/missing)
  pub events: Vec<EventMessage>,
}

impl DispatchResult {
  fn simple(response: ResponseMessage) -> Self {
    Self { response, events: vec![] }
  }
}

pub async fn dispatch(
  incoming_request: RequestMessage,
  docker: Arc<Mutex<DockerController>>,
) -> DispatchResult {
  match incoming_request.action.as_str() {
    "containers/list" => DispatchResult::simple(container::list_instances(incoming_request, docker).await),
    "containers/create" => container::create_instance(incoming_request, docker).await,
    "containers/start" => container::start_instance(incoming_request, docker).await,
    "containers/stop" => DispatchResult::simple(container::stop_instance(incoming_request, docker).await),
    "containers/restart" => container::restart_instance(incoming_request, docker).await,
    "containers/remove" => DispatchResult::simple(container::remove_instance(incoming_request, docker).await),
    "containers/logs" => DispatchResult::simple(container::fetch_logs(incoming_request, docker).await),
    "bot/initialize" => DispatchResult::simple(container::initialize_bot(incoming_request, docker).await),
    "bot/plugin/install" => DispatchResult::simple(container::install_plugin(incoming_request, docker).await),
    "bot/env/update" => DispatchResult::simple(container::update_bot_env(incoming_request, docker).await),
    "system/ping" => DispatchResult::simple(system::ping(incoming_request).await),
    "system/info" => DispatchResult::simple(system::info(incoming_request).await),
    unknown_action => {
      warn!("Ação desconhecida recebida do servidor: '{}'", unknown_action);
      DispatchResult::simple(ResponseMessage::error(
        incoming_request.message_id,
        "ACTION_NOT_FOUND",
        &format!("Ação não reconhecida pelo daemon: '{}'", unknown_action),
      ))
    }
  }
}
