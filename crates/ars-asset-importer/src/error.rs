use std::path::PathBuf;

use thiserror::Error;

pub type Result<T> = std::result::Result<T, AssetImporterError>;

#[derive(Debug, Error)]
pub enum AssetImporterError {
    #[error("I/O error at {path}: {source}")]
    Io {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("unsupported asset format: {0}")]
    UnsupportedFormat(String),

    #[error("glTF load failed: {0}")]
    Gltf(#[from] gltf::Error),

    #[error("asset contains no geometry")]
    EmptyGeometry,

    #[error("TOML serialize failed: {0}")]
    TomlSer(#[from] toml::ser::Error),

    #[error("TOML parse failed: {0}")]
    TomlDe(#[from] toml::de::Error),
}

impl AssetImporterError {
    pub fn io(path: impl Into<PathBuf>, source: std::io::Error) -> Self {
        Self::Io {
            path: path.into(),
            source,
        }
    }
}
