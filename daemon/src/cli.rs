use clap::{Parser, Subcommand};

#[derive(Debug, Parser)]
#[command(name = "daemon")]
#[command(about = "Fragment Daemon")]
pub struct Cli {
    /// Set the location for the configuration file
    #[arg(long, global = true, default_value = "config.toml")]
    pub config: String,

    /// Pass in order to run daemon in debug mode
    #[arg(long, global = true)]
    pub debug: bool,

    #[command(subcommand)]
    pub command: Option<Commands>,
}

#[derive(Debug, Subcommand)]
pub enum Commands {
    /// Configure the daemon with panel details
    Configure {
        /// The base URL for this daemon's panel
        #[arg(long)]
        panel_url: Option<String>,

        /// The token to use when connecting this daemon
        #[arg(short, long)]
        token: String,

        /// The IP or hostname this daemon should bind to
        #[arg(long)]
        ip: Option<String>,

        /// The API port this daemon should listen on
        #[arg(short, long, default_value_t = 3500)]
        port: u16,

        /// The ID of the node which will be connected to this daemon
        #[arg(short, long)]
        node: Option<String>,

        /// The path where the configuration file should be made
        #[arg(short, long, default_value = "config.toml")]
        config_path: String,

        /// Set to true to disable certificate checking
        #[arg(long)]
        allow_insecure: bool,

        /// Set to true to override an existing configuration for this node
        #[arg(long = "override", alias = "override-config")]
        override_config: bool,
    },
}
