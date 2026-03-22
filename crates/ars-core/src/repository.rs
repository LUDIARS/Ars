use async_trait::async_trait;

use crate::error::Result;
use crate::models::{Project, ProjectSummary, Session, User};

/// プロジェクト永続化の抽象
#[async_trait]
pub trait ProjectRepository: Send + Sync {
    async fn save(&self, user_id: &str, project_id: &str, project: &Project) -> Result<()>;
    async fn load(&self, user_id: &str, project_id: &str) -> Result<Option<Project>>;
    async fn list(&self, user_id: &str) -> Result<Vec<ProjectSummary>>;
    async fn delete(&self, user_id: &str, project_id: &str) -> Result<()>;
}

/// ユーザー永続化の抽象
#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn put(&self, user: &User) -> Result<()>;
    async fn get(&self, user_id: &str) -> Result<Option<User>>;
    async fn get_by_provider_id(&self, provider: &str, provider_id: &str) -> Result<Option<User>>;
}

/// セッション永続化の抽象
///
/// ネイティブ: ローカルファイルに永続保存（有効期限なし）
/// Web: DynamoDB にTTL付きで保存
#[async_trait]
pub trait SessionRepository: Send + Sync {
    async fn put(&self, session: &Session) -> Result<()>;
    async fn get(&self, session_id: &str) -> Result<Option<Session>>;
    async fn delete(&self, session_id: &str) -> Result<()>;
    /// 現在有効なセッションを取得（ネイティブでは最新の1件を返す）
    async fn get_active(&self) -> Result<Option<Session>>;
}
