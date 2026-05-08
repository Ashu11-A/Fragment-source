use std::sync::Arc;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::sync::Mutex;
use tracing::{error, info, warn};

use crate::command_handlers;
use crate::docker::DockerController;
use crate::protocol::types::{EventMessage, RequestMessage, ResponseMessage};

const RECONNECT_DELAY_SECS: u64 = 5;
// Capacidade inicial do buffer de leitura; redimensionado dinamicamente conforme necessário
const INITIAL_BUFFER_CAPACITY: usize = 8192;

pub async fn run_forever(
  server_address: String,
  docker: Arc<Mutex<DockerController>>,
  auth_token: String,
) {
  loop {
    info!("Conectando ao servidor em {}", server_address);

    match TcpStream::connect(&server_address).await {
      Ok(stream) => {
        info!("Conexão TCP estabelecida com o servidor");
        match handle_connection(stream, docker.clone(), &auth_token).await {
          Ok(()) => info!("Conexão encerrada normalmente"),
          Err(connection_error) => error!("Conexão encerrada com erro: {}", connection_error),
        }
      }
      Err(connect_error) => {
        warn!(
          "Falha ao conectar em '{}': {}. Tentando novamente em {}s",
          server_address, connect_error, RECONNECT_DELAY_SECS
        );
      }
    }

    tokio::time::sleep(Duration::from_secs(RECONNECT_DELAY_SECS)).await;
  }
}

async fn handle_connection(
  stream: TcpStream,
  docker: Arc<Mutex<DockerController>>,
  auth_token: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
  let (mut reader, writer) = tokio::io::split(stream);
  // Compartilhado entre a tarefa principal e as tarefas de handler spawned
  let shared_writer = Arc::new(Mutex::new(writer));

  // Identifica este daemon ao servidor imediatamente após conectar
  let auth_event = EventMessage::new("daemon/auth", serde_json::json!({ "token": auth_token }));
  write_serializable(shared_writer.clone(), &auth_event).await;

  let mut read_buffer = vec![0u8; INITIAL_BUFFER_CAPACITY];

  loop {
    // Lê o uint32 big-endian que indica o comprimento do próximo quadro
    let frame_body_length = match reader.read_u32().await {
      Ok(declared_length) => declared_length as usize,
      // EOF limpo indica que o servidor encerrou a conexão intencionalmente
      Err(eof_error) if eof_error.kind() == std::io::ErrorKind::UnexpectedEof => break,
      Err(read_error) => return Err(read_error.into()),
    };

    if read_buffer.len() < frame_body_length {
      read_buffer.resize(frame_body_length, 0);
    }

    reader
      .read_exact(&mut read_buffer[..frame_body_length])
      .await?;

    let raw_json = std::str::from_utf8(&read_buffer[..frame_body_length])?;

    let request: RequestMessage = match serde_json::from_str(raw_json) {
      Ok(parsed) => parsed,
      Err(parse_error) => {
        warn!("Quadro JSON inválido descartado: {}", parse_error);
        continue;
      }
    };

    // Cada requisição é processada em paralelo para não bloquear o loop de leitura
    let docker_clone = docker.clone();
    let writer_clone = shared_writer.clone();

    tokio::spawn(async move {
      let result = command_handlers::dispatch(request, docker_clone).await;
      write_serializable(writer_clone.clone(), &result.response).await;
      // Envia eventos de efeito colateral (ex: bot/token/missing) após a resposta
      for event in result.events {
        write_serializable(writer_clone.clone(), &event).await;
      }
    });
  }

  Ok(())
}

async fn write_serializable<T: serde::Serialize>(
  writer: Arc<Mutex<tokio::io::WriteHalf<TcpStream>>>,
  value: &T,
) {
  let serialized_body = match serde_json::to_vec(value) {
    Ok(bytes) => bytes,
    Err(serialize_error) => {
      error!("Falha ao serializar mensagem: {}", serialize_error);
      return;
    }
  };

  let declared_length = serialized_body.len() as u32;
  let mut writer_guard = writer.lock().await;

  if let Err(header_error) = writer_guard.write_all(&declared_length.to_be_bytes()).await {
    error!("Falha ao enviar cabeçalho do quadro: {}", header_error);
    return;
  }

  if let Err(body_error) = writer_guard.write_all(&serialized_body).await {
    error!("Falha ao enviar corpo do quadro: {}", body_error);
  }
}

// Mantido para compatibilidade com código que ancora no tipo explícito
#[allow(dead_code)]
async fn write_response(
  writer: Arc<Mutex<tokio::io::WriteHalf<TcpStream>>>,
  response: ResponseMessage,
) {
  write_serializable(writer, &response).await;
}
