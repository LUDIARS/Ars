use std::fs;
use std::path::PathBuf;

use async_trait::async_trait;

use ars_core::error::{ArsError, Result};
use ars_core::models::User;
use ars_core::repository::UserRepository;

/// ローカルファイルベースのユーザーリポジトリ
///
/// ネイティブはシングルユーザー。~/.ars/user.json に1ユーザー分を保存。
pub struct LocalUserRepository {
    user_file: PathBuf,
}

impl LocalUserRepository {
    pub fn new(user_file: PathBuf) -> Self {
        Self { user_file }
    }

    pub fn with_defaults() -> Result<Self> {
        let path = dirs::home_dir()
            .ok_or_else(|| ArsError::Storage("Cannot determine home directory".into()))?
            .join(".ars")
            .join("user.json");
        Ok(Self::new(path))
    }
}

#[async_trait]
impl UserRepository for LocalUserRepository {
    async fn put(&self, user: &User) -> Result<()> {
        if let Some(parent) = self.user_file.parent() {
            fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_string_pretty(user)?;
        fs::write(&self.user_file, json)?;
        Ok(())
    }

    async fn get(&self, _user_id: &str) -> Result<Option<User>> {
        if !self.user_file.exists() {
            return Ok(None);
        }
        let content = fs::read_to_string(&self.user_file)?;
        let user: User = serde_json::from_str(&content)?;
        Ok(Some(user))
    }

    async fn get_by_provider_id(&self, _provider: &str, _provider_id: &str) -> Result<Option<User>> {
        // シングルユーザーなので、ファイルがあれば返す
        self.get("local").await
    }
}
