mod cli;
mod command_handlers;
mod config;
mod db;
mod docker;
mod entities;
mod error;
mod models;
mod network;
mod protocol;

use std::sync::Arc;

use clap::Parser;
use cli::{Cli, Commands};
use docker::DockerController;
use error::DaemonError;
use tokio::sync::Mutex;
use tracing::info;

#[tokio::main]
async fn main() -> Result<(), DaemonError> {
  tracing_subscriber::fmt()
    .with_env_filter(
      tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
    )
    .init();

  let cli = Cli::parse();
  let debug = cli.debug;

  match cli.command {
    Some(Commands::Configure {
      panel_url,
      token,
      ip,
      port,
      node,
      config_path,
      allow_insecure,
      override_config,
    }) => {
      if config::config_exists(&config_path) && !override_config {
        println!(
          "Configuration already exists at {}. Use --override to overwrite.",
          config_path
        );
        return Ok(());
      }

      let daemon_config = match (panel_url.as_deref(), node.as_deref()) {
        (Some(panel_url), Some(node)) => {
          println!("Fetching configuration from panel...");
          config::fetch_config(panel_url, node, &token, allow_insecure).await?
        }
        _ => config::build_config(&token, port, ip.as_deref(), panel_url.as_deref(), debug)?,
      };

      config::save_config(&config_path, &daemon_config)?;
      println!("Configuration saved to {}", config_path);
      return Ok(());
    }
    None => {}
  }

  info!("Iniciando Fragment Daemon...");

  let loaded_config = config::load_config(&cli.config)?;
  info!("Configuração carregada de {}", cli.config);

  let database_connection = db::init_db().await?;
  db::setup_schema(&database_connection).await?;
  info!("Banco de dados inicializado");

  let docker_controller = DockerController::new(
    database_connection,
    loaded_config.remote.clone(),
    loaded_config.container_url.clone(),
  )?;

  docker_controller.ensure_network_exists().await?;
  info!("Rede Docker '{}' verificada", crate::docker::NETWORK_NAME);

  info!("Restaurando instâncias do estado persistido...");
  let restored_instances = docker_controller.restore_instances().await?;
  info!("{} instância(s) restaurada(s)", restored_instances.len());
  for restored_instance in &restored_instances {
    info!(
      "  - {} ({}, status: {})",
      restored_instance.name, restored_instance.image, restored_instance.status
    );
  }

  let shared_docker = Arc::new(Mutex::new(docker_controller));

  // DAEMON_SERVER_ADDRESS deve ser "host:porta" (ex: "localhost:9000").
  // Se ausente, extrai host e porta da URL do painel e usa porta 9000 por convenção.
  let daemon_server_address = std::env::var("DAEMON_SERVER_ADDRESS")
    .unwrap_or_else(|_| derive_tcp_address_from_url(&loaded_config.remote, 9000));

  info!("Conectando ao servidor de daemons em {}", daemon_server_address);

  tokio::select! {
    // Loop de reconexão infinito — encerrado quando o processo recebe SIGINT
    _ = network::client::run_forever(daemon_server_address, shared_docker, loaded_config.token) => {}
    _ = tokio::signal::ctrl_c() => {
      info!("Sinal de interrupção recebido, encerrando daemon");
    }
  }

  info!("Fragment Daemon encerrado");
  Ok(())
}

// Converte "http://host:porta/caminho" → "host:tcp_port".
// A porta da URL do painel (HTTP) nunca é usada — o servidor TCP fica em tcp_port.
fn derive_tcp_address_from_url(raw_url: &str, tcp_port: u16) -> String {
  let stripped = raw_url
    .trim_start_matches("https://")
    .trim_start_matches("http://");

  // Extrai apenas o hostname, descartando a porta HTTP e qualquer caminho
  let authority = stripped.split('/').next().unwrap_or(stripped);
  let hostname = authority.split(':').next().unwrap_or(authority);
  format!("{}:{}", hostname, tcp_port)
}
