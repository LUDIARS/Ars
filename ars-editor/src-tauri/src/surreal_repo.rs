/// SurrealDB を使った Repository trait 実装
///
/// SurrealClient をラップし、ars-core の UserRepository / ProjectRepository に適合させる。
use async_trait::async_trait;

use ars_core::error::{ArsError, Result};
use ars_core::models as core_models;
use ars_core::repository::{ProjectRepository, UserRepository};

use crate::surrealdb_client::SurrealClient;

// ── Project ─────────────────────────────────────────

pub struct SurrealProjectRepository {
    client: SurrealClient,
}

impl SurrealProjectRepository {
    pub fn new(client: SurrealClient) -> Self {
        Self { client }
    }
}

#[async_trait]
impl ProjectRepository for SurrealProjectRepository {
    async fn save(&self, user_id: &str, project_id: &str, project: &core_models::Project) -> Result<()> {
        let local_project = to_local_project(project);
        self.client
            .save_project(user_id, project_id, &local_project)
            .await
            .map_err(ArsError::Storage)
    }

    async fn load(&self, user_id: &str, project_id: &str) -> Result<Option<core_models::Project>> {
        let result = self.client
            .load_project(user_id, project_id)
            .await
            .map_err(ArsError::Storage)?;
        Ok(result.map(|p| to_core_project(&p)))
    }

    async fn list(&self, user_id: &str) -> Result<Vec<core_models::ProjectSummary>> {
        let summaries = self.client
            .list_user_projects(user_id)
            .await
            .map_err(ArsError::Storage)?;
        Ok(summaries
            .into_iter()
            .map(|s| core_models::ProjectSummary {
                id: s.id,
                name: s.name,
                updated_at: s.updated_at,
            })
            .collect())
    }

    async fn delete(&self, user_id: &str, project_id: &str) -> Result<()> {
        self.client
            .delete_project(user_id, project_id)
            .await
            .map_err(ArsError::Storage)
    }
}

// ── User ────────────────────────────────────────────

pub struct SurrealUserRepository {
    client: SurrealClient,
}

impl SurrealUserRepository {
    pub fn new(client: SurrealClient) -> Self {
        Self { client }
    }
}

#[async_trait]
impl UserRepository for SurrealUserRepository {
    async fn put(&self, user: &core_models::User) -> Result<()> {
        let local_user = to_local_user(user);
        self.client
            .put_user(&local_user)
            .await
            .map_err(ArsError::Storage)
    }

    async fn get(&self, user_id: &str) -> Result<Option<core_models::User>> {
        let result = self.client
            .get_user(user_id)
            .await
            .map_err(ArsError::Storage)?;
        Ok(result.map(|u| to_core_user(&u)))
    }

    async fn get_by_provider_id(&self, provider: &str, provider_id: &str) -> Result<Option<core_models::User>> {
        if provider != "github" {
            return Ok(None);
        }
        let github_id: i64 = provider_id
            .parse()
            .map_err(|_| ArsError::Validation("Invalid GitHub ID".into()))?;
        let result = self.client
            .get_user_by_github_id(github_id)
            .await
            .map_err(ArsError::Storage)?;
        Ok(result.map(|u| to_core_user(&u)))
    }
}

// ── 型変換ヘルパー ──────────────────────────────────

fn to_local_project(p: &core_models::Project) -> crate::models::Project {
    let json = serde_json::to_value(p).unwrap();
    serde_json::from_value(json).unwrap()
}

fn to_core_project(p: &crate::models::Project) -> core_models::Project {
    let json = serde_json::to_value(p).unwrap();
    serde_json::from_value(json).unwrap()
}

fn to_local_user(u: &core_models::User) -> crate::auth::User {
    crate::auth::User {
        id: u.id.clone(),
        github_id: u.provider_id.parse().unwrap_or(0),
        login: u.login.clone(),
        display_name: u.display_name.clone(),
        avatar_url: u.avatar_url.clone(),
        email: u.email.clone(),
        created_at: u.created_at.clone(),
        updated_at: u.updated_at.clone(),
    }
}

fn to_core_user(u: &crate::auth::User) -> core_models::User {
    core_models::User {
        id: u.id.clone(),
        provider_id: u.github_id.to_string(),
        provider: "github".to_string(),
        login: u.login.clone(),
        display_name: u.display_name.clone(),
        avatar_url: u.avatar_url.clone(),
        email: u.email.clone(),
        created_at: u.created_at.clone(),
        updated_at: u.updated_at.clone(),
    }
}
