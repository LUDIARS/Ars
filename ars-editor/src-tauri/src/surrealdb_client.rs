/// SurrealDB 組み込みデータベースサービス
///
/// プロジェクト設定、ユーザー認証、セッション管理、クラウドプロジェクトを
/// SurrealDBで一元管理する。RocksDBバックエンドで永続化。
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use surrealdb::engine::local::RocksDb;
use surrealdb::Surreal;

use crate::auth::{Session, User};
use crate::models::Project;

#[derive(Clone)]
pub struct SurrealClient {
    db: Surreal<surrealdb::engine::local::Db>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SettingRecord {
    project_id: String,
    setting_key: String,
    value: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSummary {
    pub id: String,
    pub name: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

impl SurrealClient {
    pub async fn new(data_dir: &str) -> Result<Self, String> {
        let db = Surreal::new::<RocksDb>(data_dir)
            .await
            .map_err(|e| format!("SurrealDB init failed: {}", e))?;

        db.use_ns("ars")
            .use_db("main")
            .await
            .map_err(|e| format!("SurrealDB namespace setup failed: {}", e))?;

        // インデックス定義
        db.query("DEFINE INDEX IF NOT EXISTS idx_setting_lookup ON project_setting FIELDS project_id, setting_key UNIQUE")
            .await
            .map_err(|e| format!("SurrealDB index creation failed: {}", e))?;

        db.query("DEFINE INDEX IF NOT EXISTS idx_user_github ON user FIELDS github_id UNIQUE")
            .await
            .map_err(|e| format!("SurrealDB index creation failed: {}", e))?;

        db.query("DEFINE INDEX IF NOT EXISTS idx_cloud_project_user ON cloud_project FIELDS user_id")
            .await
            .map_err(|e| format!("SurrealDB index creation failed: {}", e))?;

        Ok(Self { db })
    }

    // ========== Project setting operations ==========

    /// 個別設定を保存（upsert）
    pub async fn put_setting(
        &self,
        project_id: &str,
        key: &str,
        value: &str,
    ) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();
        self.db
            .query("INSERT INTO project_setting (project_id, setting_key, value, updated_at) VALUES ($project_id, $key, $value, $now) ON DUPLICATE KEY UPDATE value = $value, updated_at = $now")
            .bind(("project_id", project_id.to_string()))
            .bind(("key", key.to_string()))
            .bind(("value", value.to_string()))
            .bind(("now", now))
            .await
            .map_err(|e| format!("SurrealDB put_setting failed: {}", e))?;
        Ok(())
    }

    /// 個別設定を取得
    pub async fn get_setting(
        &self,
        project_id: &str,
        key: &str,
    ) -> Result<Option<String>, String> {
        let mut result = self.db
            .query("SELECT value FROM project_setting WHERE project_id = $project_id AND setting_key = $key LIMIT 1")
            .bind(("project_id", project_id.to_string()))
            .bind(("key", key.to_string()))
            .await
            .map_err(|e| format!("SurrealDB get_setting failed: {}", e))?;

        let rows: Vec<SettingRecord> = result
            .take(0)
            .map_err(|e| format!("SurrealDB deserialize failed: {}", e))?;

        Ok(rows.into_iter().next().map(|r| r.value))
    }

    /// プロジェクトの全設定を取得
    pub async fn get_all_settings(
        &self,
        project_id: &str,
    ) -> Result<HashMap<String, String>, String> {
        let mut result = self.db
            .query("SELECT setting_key, value FROM project_setting WHERE project_id = $project_id")
            .bind(("project_id", project_id.to_string()))
            .await
            .map_err(|e| format!("SurrealDB get_all_settings failed: {}", e))?;

        let rows: Vec<SettingRecord> = result
            .take(0)
            .map_err(|e| format!("SurrealDB deserialize failed: {}", e))?;

        let mut settings = HashMap::new();
        for row in rows {
            settings.insert(row.setting_key, row.value);
        }
        Ok(settings)
    }

    /// 複数設定を一括保存
    pub async fn put_settings_batch(
        &self,
        project_id: &str,
        settings: &HashMap<String, String>,
    ) -> Result<(), String> {
        for (key, value) in settings {
            self.put_setting(project_id, key, value).await?;
        }
        Ok(())
    }

    /// 個別設定を削除
    pub async fn delete_setting(
        &self,
        project_id: &str,
        key: &str,
    ) -> Result<(), String> {
        self.db
            .query("DELETE FROM project_setting WHERE project_id = $project_id AND setting_key = $key")
            .bind(("project_id", project_id.to_string()))
            .bind(("key", key.to_string()))
            .await
            .map_err(|e| format!("SurrealDB delete_setting failed: {}", e))?;
        Ok(())
    }

    // ========== User operations ==========

    pub async fn put_user(&self, user: &User) -> Result<(), String> {
        self.db
            .query("INSERT INTO user (id, github_id, login, display_name, avatar_url, email, created_at, updated_at) VALUES ($id, $github_id, $login, $display_name, $avatar_url, $email, $created_at, $updated_at) ON DUPLICATE KEY UPDATE login = $login, display_name = $display_name, avatar_url = $avatar_url, email = $email, updated_at = $updated_at")
            .bind(("id", user.id.clone()))
            .bind(("github_id", user.github_id))
            .bind(("login", user.login.clone()))
            .bind(("display_name", user.display_name.clone()))
            .bind(("avatar_url", user.avatar_url.clone()))
            .bind(("email", user.email.clone()))
            .bind(("created_at", user.created_at.clone()))
            .bind(("updated_at", user.updated_at.clone()))
            .await
            .map_err(|e| format!("SurrealDB put_user failed: {}", e))?;
        Ok(())
    }

    pub async fn get_user(&self, user_id: &str) -> Result<Option<User>, String> {
        let mut result = self.db
            .query("SELECT * FROM user WHERE id = $user_id LIMIT 1")
            .bind(("user_id", user_id.to_string()))
            .await
            .map_err(|e| format!("SurrealDB get_user failed: {}", e))?;

        let rows: Vec<UserRecord> = result
            .take(0)
            .map_err(|e| format!("SurrealDB deserialize failed: {}", e))?;

        Ok(rows.into_iter().next().map(|r| r.into_user()))
    }

    pub async fn get_user_by_github_id(&self, github_id: i64) -> Result<Option<User>, String> {
        let mut result = self.db
            .query("SELECT * FROM user WHERE github_id = $github_id LIMIT 1")
            .bind(("github_id", github_id))
            .await
            .map_err(|e| format!("SurrealDB get_user_by_github_id failed: {}", e))?;

        let rows: Vec<UserRecord> = result
            .take(0)
            .map_err(|e| format!("SurrealDB deserialize failed: {}", e))?;

        Ok(rows.into_iter().next().map(|r| r.into_user()))
    }

    // ========== Session operations ==========

    pub async fn put_session(&self, session: &Session) -> Result<(), String> {
        self.db
            .query("INSERT INTO session (id, user_id, expires_at, created_at, access_token) VALUES ($id, $user_id, $expires_at, $created_at, $access_token) ON DUPLICATE KEY UPDATE expires_at = $expires_at, access_token = $access_token")
            .bind(("id", session.id.clone()))
            .bind(("user_id", session.user_id.clone()))
            .bind(("expires_at", session.expires_at.clone()))
            .bind(("created_at", session.created_at.clone()))
            .bind(("access_token", session.access_token.clone()))
            .await
            .map_err(|e| format!("SurrealDB put_session failed: {}", e))?;
        Ok(())
    }

    pub async fn get_session(&self, session_id: &str) -> Result<Option<Session>, String> {
        let mut result = self.db
            .query("SELECT * FROM session WHERE id = $session_id LIMIT 1")
            .bind(("session_id", session_id.to_string()))
            .await
            .map_err(|e| format!("SurrealDB get_session failed: {}", e))?;

        let rows: Vec<SessionRecord> = result
            .take(0)
            .map_err(|e| format!("SurrealDB deserialize failed: {}", e))?;

        Ok(rows.into_iter().next().map(|r| r.into_session()))
    }

    pub async fn delete_session(&self, session_id: &str) -> Result<(), String> {
        self.db
            .query("DELETE FROM session WHERE id = $session_id")
            .bind(("session_id", session_id.to_string()))
            .await
            .map_err(|e| format!("SurrealDB delete_session failed: {}", e))?;
        Ok(())
    }

    // ========== Cloud project operations ==========

    pub async fn save_project(&self, user_id: &str, project_id: &str, project: &Project) -> Result<(), String> {
        let project_json = serde_json::to_string(project)
            .map_err(|e| format!("Failed to serialize project: {}", e))?;
        let now = chrono::Utc::now().to_rfc3339();

        self.db
            .query("INSERT INTO cloud_project (id, user_id, name, data, updated_at) VALUES ($id, $user_id, $name, $data, $updated_at) ON DUPLICATE KEY UPDATE name = $name, data = $data, updated_at = $updated_at")
            .bind(("id", project_id.to_string()))
            .bind(("user_id", user_id.to_string()))
            .bind(("name", project.name.clone()))
            .bind(("data", project_json))
            .bind(("updated_at", now))
            .await
            .map_err(|e| format!("SurrealDB save_project failed: {}", e))?;
        Ok(())
    }

    pub async fn load_project(&self, user_id: &str, project_id: &str) -> Result<Option<Project>, String> {
        let mut result = self.db
            .query("SELECT * FROM cloud_project WHERE id = $project_id LIMIT 1")
            .bind(("project_id", project_id.to_string()))
            .await
            .map_err(|e| format!("SurrealDB load_project failed: {}", e))?;

        let rows: Vec<CloudProjectRecord> = result
            .take(0)
            .map_err(|e| format!("SurrealDB deserialize failed: {}", e))?;

        match rows.into_iter().next() {
            Some(record) => {
                if record.user_id != user_id {
                    return Err("Access denied".to_string());
                }
                let project: Project = serde_json::from_str(&record.data)
                    .map_err(|e| format!("Failed to parse project: {}", e))?;
                Ok(Some(project))
            }
            None => Ok(None),
        }
    }

    pub async fn list_user_projects(&self, user_id: &str) -> Result<Vec<ProjectSummary>, String> {
        let mut result = self.db
            .query("SELECT id, name, updated_at FROM cloud_project WHERE user_id = $user_id ORDER BY updated_at DESC")
            .bind(("user_id", user_id.to_string()))
            .await
            .map_err(|e| format!("SurrealDB list_user_projects failed: {}", e))?;

        let rows: Vec<ProjectSummaryRecord> = result
            .take(0)
            .map_err(|e| format!("SurrealDB deserialize failed: {}", e))?;

        Ok(rows.into_iter().map(|r| ProjectSummary {
            id: r.id,
            name: r.name,
            updated_at: r.updated_at,
        }).collect())
    }

    pub async fn delete_project(&self, user_id: &str, project_id: &str) -> Result<(), String> {
        // Verify ownership
        let mut result = self.db
            .query("SELECT user_id FROM cloud_project WHERE id = $project_id LIMIT 1")
            .bind(("project_id", project_id.to_string()))
            .await
            .map_err(|e| format!("SurrealDB get_project failed: {}", e))?;

        let rows: Vec<OwnerRecord> = result
            .take(0)
            .map_err(|e| format!("SurrealDB deserialize failed: {}", e))?;

        match rows.into_iter().next() {
            Some(record) => {
                if record.user_id != user_id {
                    return Err("Access denied".to_string());
                }
            }
            None => return Err("Project not found".to_string()),
        }

        self.db
            .query("DELETE FROM cloud_project WHERE id = $project_id")
            .bind(("project_id", project_id.to_string()))
            .await
            .map_err(|e| format!("SurrealDB delete_project failed: {}", e))?;
        Ok(())
    }
}

// ========== Internal record types for SurrealDB deserialization ==========

#[derive(Debug, Deserialize)]
struct UserRecord {
    id: String,
    github_id: i64,
    login: String,
    display_name: String,
    avatar_url: String,
    email: Option<String>,
    created_at: String,
    updated_at: String,
}

impl UserRecord {
    fn into_user(self) -> User {
        User {
            id: self.id,
            github_id: self.github_id,
            login: self.login,
            display_name: self.display_name,
            avatar_url: self.avatar_url,
            email: self.email,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}

#[derive(Debug, Deserialize)]
struct SessionRecord {
    id: String,
    user_id: String,
    expires_at: String,
    created_at: String,
    access_token: String,
}

impl SessionRecord {
    fn into_session(self) -> Session {
        Session {
            id: self.id,
            user_id: self.user_id,
            expires_at: self.expires_at,
            created_at: self.created_at,
            access_token: self.access_token,
        }
    }
}

#[derive(Debug, Deserialize)]
struct CloudProjectRecord {
    user_id: String,
    data: String,
}

#[derive(Debug, Deserialize)]
struct ProjectSummaryRecord {
    id: String,
    name: String,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
struct OwnerRecord {
    user_id: String,
}
