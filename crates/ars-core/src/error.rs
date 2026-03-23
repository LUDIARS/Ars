use thiserror::Error;

#[derive(Debug, Error)]
pub enum ArsError {
    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Access denied: {0}")]
    AccessDenied(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Auth error: {0}")]
    Auth(String),
}

pub type Result<T> = std::result::Result<T, ArsError>;
