use std::fs;
use std::path::PathBuf;

use async_trait::async_trait;

use ars_core::error::{ArsError, Result};
use ars_core::models::Session;
use ars_core::repository::SessionRepository;

/// ローカルファイルベースのセッションリポジトリ
///
/// ~/.ars/session.json に永続保存。同一PCで再認証不要。
/// 有効期限なし（expires_at = None）。
pub struct LocalSessionRepository {
    session_file: PathBuf,
}

impl LocalSessionRepository {
    pub fn new(session_file: PathBuf) -> Self {
        Self { session_file }
    }

    pub fn with_defaults() -> Result<Self> {
        let path = dirs::home_dir()
            .ok_or_else(|| ArsError::Storage("Cannot determine home directory".into()))?
            .join(".ars")
            .join("session.json");
        Ok(Self::new(path))
    }
}

#[async_trait]
impl SessionRepository for LocalSessionRepository {
    async fn put(&self, session: &Session) -> Result<()> {
        if let Some(parent) = self.session_file.parent() {
            fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_string_pretty(session)?;
        fs::write(&self.session_file, json)?;
        Ok(())
    }

    async fn get(&self, _session_id: &str) -> Result<Option<Session>> {
        // ローカルはセッション1つだけなのでIDは無視
        self.get_active().await
    }

    async fn delete(&self, _session_id: &str) -> Result<()> {
        if self.session_file.exists() {
            fs::remove_file(&self.session_file)?;
        }
        Ok(())
    }

    /// ローカルの永続セッションを返す。ファイルがあれば常に有効。
    async fn get_active(&self) -> Result<Option<Session>> {
        if !self.session_file.exists() {
            return Ok(None);
        }
        let content = fs::read_to_string(&self.session_file)?;
        let session: Session = serde_json::from_str(&content)?;
        // ローカルセッションは有効期限なし → 常に有効
        Ok(Some(session))
    }
}
