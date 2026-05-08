use std::fmt;

#[derive(Debug)]
pub enum DaemonError {
    Io(std::io::Error),
    Docker(bollard::errors::Error),
    Database(sea_orm::DbErr),
    Json(serde_json::Error),
    TomlSerialize(toml::ser::Error),
    TomlDeserialize(toml::de::Error),
    Http(reqwest::Error),
    Message(String),
}

impl fmt::Display for DaemonError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io(error) => write!(formatter, "IO error: {}", error),
            Self::Docker(error) => write!(formatter, "Docker error: {}", error),
            Self::Database(error) => write!(formatter, "Database error: {}", error),
            Self::Json(error) => write!(formatter, "JSON error: {}", error),
            Self::TomlSerialize(error) => {
                write!(formatter, "TOML serialize error: {}", error)
            }
            Self::TomlDeserialize(error) => {
                write!(formatter, "TOML deserialize error: {}", error)
            }
            Self::Http(error) => write!(formatter, "HTTP error: {}", error),
            Self::Message(message) => formatter.write_str(message),
        }
    }
}

impl std::error::Error for DaemonError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Io(error) => Some(error),
            Self::Docker(error) => Some(error),
            Self::Database(error) => Some(error),
            Self::Json(error) => Some(error),
            Self::TomlSerialize(error) => Some(error),
            Self::TomlDeserialize(error) => Some(error),
            Self::Http(error) => Some(error),
            Self::Message(_) => None,
        }
    }
}

impl From<std::io::Error> for DaemonError {
    fn from(error: std::io::Error) -> Self {
        DaemonError::Io(error)
    }
}

impl From<bollard::errors::Error> for DaemonError {
    fn from(error: bollard::errors::Error) -> Self {
        DaemonError::Docker(error)
    }
}

impl From<sea_orm::DbErr> for DaemonError {
    fn from(error: sea_orm::DbErr) -> Self {
        DaemonError::Database(error)
    }
}

impl From<serde_json::Error> for DaemonError {
    fn from(error: serde_json::Error) -> Self {
        DaemonError::Json(error)
    }
}

impl From<toml::ser::Error> for DaemonError {
    fn from(error: toml::ser::Error) -> Self {
        DaemonError::TomlSerialize(error)
    }
}

impl From<toml::de::Error> for DaemonError {
    fn from(error: toml::de::Error) -> Self {
        DaemonError::TomlDeserialize(error)
    }
}

impl From<reqwest::Error> for DaemonError {
    fn from(error: reqwest::Error) -> Self {
        DaemonError::Http(error)
    }
}

impl From<String> for DaemonError {
    fn from(message: String) -> Self {
        DaemonError::Message(message)
    }
}

impl From<&str> for DaemonError {
    fn from(message: &str) -> Self {
        DaemonError::Message(message.to_string())
    }
}

impl From<Box<dyn std::error::Error + Send + Sync>> for DaemonError {
    fn from(error: Box<dyn std::error::Error + Send + Sync>) -> Self {
        DaemonError::Message(error.to_string())
    }
}
