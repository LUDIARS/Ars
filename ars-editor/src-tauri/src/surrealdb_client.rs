/// SurrealDB HTTP クライアント
///
/// 外部 SurrealDB インスタンスに HTTP 経由で接続し、SurrealQL クエリを実行する。
/// 組み込み DB ドライバー（RocksDB）を使わないため、C++ コンパイルが不要になり
/// ビルド時間を大幅に短縮する。
use serde::Deserialize;
use serde_json::Value;
use std::collections::HashMap;

use ars_core::models::{Project, ProjectSummary, User};

#[derive(Clone)]
pub struct SurrealClient {
    http: reqwest::Client,
    endpoint: String,
    username: String,
    password: String,
}

#[derive(Debug, Deserialize)]
struct QueryResult {
    #[serde(default)]
    result: Value,
    status: String,
}

impl SurrealClient {
    pub async fn new(url: &str, username: &str, password: &str) -> Result<Self, String> {
        let client = Self {
            http: reqwest::Client::new(),
            endpoint: url.trim_end_matches('/').to_string(),
            username: username.to_string(),
            password: password.to_string(),
        };
        client.init_schema().await?;
        Ok(client)
    }

    /// Execute one or more SurrealQL statements and return results per statement.
    async fn execute(&self, sql: &str) -> Result<Vec<Value>, String> {
        let resp = self
            .http
            .post(format!("{}/sql", self.endpoint))
            .basic_auth(&self.username, Some(&self.password))
            .header("surreal-ns", "ars")
            .header("surreal-db", "main")
            .header("Accept", "application/json")
            .body(sql.to_string())
            .send()
            .await
            .map_err(|e| format!("SurrealDB request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("SurrealDB HTTP error ({}): {}", status, body));
        }

        let results: Vec<QueryResult> = resp
            .json()
            .await
            .map_err(|e| format!("SurrealDB response parse failed: {}", e))?;

        let mut outputs = Vec::with_capacity(results.len());
        for qr in results {
            if qr.status != "OK" {
                return Err(format!("SurrealDB query error: {}", qr.status));
            }
            outputs.push(qr.result);
        }
        Ok(outputs)
    }

    /// Execute a query and deserialize the first statement's results as `Vec<T>`.
    async fn query_vec<T: serde::de::DeserializeOwned>(&self, sql: &str) -> Result<Vec<T>, String> {
        let results = self.execute(sql).await?;
        let first = results.into_iter().next().unwrap_or(Value::Array(vec![]));
        serde_json::from_value(first)
            .map_err(|e| format!("SurrealDB deserialize failed: {}", e))
    }

    async fn init_schema(&self) -> Result<(), String> {
        self.execute(
            "DEFINE INDEX IF NOT EXISTS idx_setting_lookup ON project_setting FIELDS project_id, setting_key UNIQUE;\
             DEFINE INDEX IF NOT EXISTS idx_user_github ON user FIELDS github_id UNIQUE;\
             DEFINE INDEX IF NOT EXISTS idx_cloud_project_user ON cloud_project FIELDS user_id;\
             DEFINE TABLE IF NOT EXISTS owns_project SCHEMAFULL TYPE RELATION IN user OUT cloud_project;\
             DEFINE FIELD IF NOT EXISTS in ON owns_project TYPE record<user>;\
             DEFINE FIELD IF NOT EXISTS out ON owns_project TYPE record<cloud_project>;\
             DEFINE FIELD IF NOT EXISTS created_at ON owns_project TYPE string;",
        )
        .await?;
        Ok(())
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
        let sql = format!(
            "INSERT INTO project_setting (project_id, setting_key, value, updated_at) \
             VALUES ({pid}, {key}, {val}, {now}) \
             ON DUPLICATE KEY UPDATE value = {val}, updated_at = {now}",
            pid = qs(project_id),
            key = qs(key),
            val = qs(value),
            now = qs(&now),
        );
        self.execute(&sql).await?;
        Ok(())
    }

    /// 個別設定を取得
    pub async fn get_setting(
        &self,
        project_id: &str,
        key: &str,
    ) -> Result<Option<String>, String> {
        let sql = format!(
            "SELECT value FROM project_setting WHERE project_id = {} AND setting_key = {} LIMIT 1",
            qs(project_id),
            qs(key),
        );
        let rows: Vec<ValueRecord> = self.query_vec(&sql).await?;
        Ok(rows.into_iter().next().map(|r| r.value))
    }

    /// プロジェクトの全設定を取得
    pub async fn get_all_settings(
        &self,
        project_id: &str,
    ) -> Result<HashMap<String, String>, String> {
        let sql = format!(
            "SELECT setting_key, value FROM project_setting WHERE project_id = {}",
            qs(project_id),
        );
        let rows: Vec<SettingKvRecord> = self.query_vec(&sql).await?;
        Ok(rows
            .into_iter()
            .map(|r| (r.setting_key, r.value))
            .collect())
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
    pub async fn delete_setting(&self, project_id: &str, key: &str) -> Result<(), String> {
        let sql = format!(
            "DELETE FROM project_setting WHERE project_id = {} AND setting_key = {}",
            qs(project_id),
            qs(key),
        );
        self.execute(&sql).await?;
        Ok(())
    }

    // ========== User operations (Graph node) ==========

    pub async fn put_user(&self, user: &User) -> Result<(), String> {
        let email_val = user
            .email
            .as_deref()
            .map(qs)
            .unwrap_or_else(|| "NONE".to_string());
        let sql = format!(
            "INSERT INTO user (id, github_id, login, display_name, avatar_url, email, created_at, updated_at) \
             VALUES ({id}, {gid}, {login}, {dn}, {av}, {email}, {ca}, {ua}) \
             ON DUPLICATE KEY UPDATE login = {login}, display_name = {dn}, avatar_url = {av}, email = {email}, updated_at = {ua}",
            id = qs(&user.id),
            gid = user.github_id,
            login = qs(&user.login),
            dn = qs(&user.display_name),
            av = qs(&user.avatar_url),
            email = email_val,
            ca = qs(&user.created_at),
            ua = qs(&user.updated_at),
        );
        self.execute(&sql).await?;
        Ok(())
    }

    pub async fn get_user(&self, user_id: &str) -> Result<Option<User>, String> {
        let sql = format!(
            "SELECT * FROM user WHERE id = type::thing('user', {}) LIMIT 1",
            qs(user_id),
        );
        let rows: Vec<UserRecord> = self.query_vec(&sql).await?;
        Ok(rows.into_iter().next().map(|r| r.into_user()))
    }

    pub async fn get_user_by_github_id(&self, github_id: i64) -> Result<Option<User>, String> {
        let sql = format!(
            "SELECT * FROM user WHERE github_id = {} LIMIT 1",
            github_id,
        );
        let rows: Vec<UserRecord> = self.query_vec(&sql).await?;
        Ok(rows.into_iter().next().map(|r| r.into_user()))
    }

    // ========== Cloud project operations (Graph: user -[owns_project]-> cloud_project) ==========

    pub async fn save_project(
        &self,
        user_id: &str,
        project_id: &str,
        project: &Project,
    ) -> Result<(), String> {
        let project_json = serde_json::to_string(project)
            .map_err(|e| format!("Failed to serialize project: {}", e))?;
        let now = chrono::Utc::now().to_rfc3339();

        // プロジェクトレコードを upsert + グラフ関係を作成（既存なら無視）
        let sql = format!(
            "INSERT INTO cloud_project (id, user_id, name, data, updated_at) \
             VALUES ({id}, {uid}, {name}, {data}, {now}) \
             ON DUPLICATE KEY UPDATE name = {name}, data = {data}, updated_at = {now};\
             IF (SELECT count() FROM owns_project \
                 WHERE in = type::thing('user', {uid}) \
                   AND out = type::thing('cloud_project', {id}) GROUP ALL)[0].count = 0 \
             THEN \
                 (RELATE type::thing('user', {uid})->owns_project->type::thing('cloud_project', {id}) \
                  SET created_at = {now}) \
             END",
            id = qs(project_id),
            uid = qs(user_id),
            name = qs(&project.name),
            data = qs(&project_json),
            now = qs(&now),
        );
        self.execute(&sql).await?;
        Ok(())
    }

    pub async fn load_project(
        &self,
        user_id: &str,
        project_id: &str,
    ) -> Result<Option<Project>, String> {
        // グラフ走査でユーザーが所有するプロジェクトを取得
        let sql = format!(
            "SELECT data FROM cloud_project \
             WHERE id = type::thing('cloud_project', {pid}) \
               AND id IN (SELECT VALUE out FROM owns_project \
                          WHERE in = type::thing('user', {uid})) LIMIT 1",
            pid = qs(project_id),
            uid = qs(user_id),
        );
        let rows: Vec<CloudProjectRecord> = self.query_vec(&sql).await?;
        match rows.into_iter().next() {
            Some(record) => {
                let project: Project = serde_json::from_str(&record.data)
                    .map_err(|e| format!("Failed to parse project: {}", e))?;
                Ok(Some(project))
            }
            None => Ok(None),
        }
    }

    pub async fn list_user_projects(
        &self,
        user_id: &str,
    ) -> Result<Vec<ProjectSummary>, String> {
        // グラフ走査でユーザーの全プロジェクトを取得
        let sql = format!(
            "SELECT id, name, updated_at FROM cloud_project \
             WHERE id IN (SELECT VALUE out FROM owns_project \
                          WHERE in = type::thing('user', {})) \
             ORDER BY updated_at DESC",
            qs(user_id),
        );
        let rows: Vec<ProjectSummaryRecord> = self.query_vec(&sql).await?;
        Ok(rows
            .into_iter()
            .map(|r| ProjectSummary {
                id: parse_record_id(&r.id),
                name: r.name,
                updated_at: r.updated_at,
            })
            .collect())
    }

    pub async fn delete_project(
        &self,
        user_id: &str,
        project_id: &str,
    ) -> Result<(), String> {
        // グラフ走査で所有権を確認
        let sql = format!(
            "SELECT count() FROM owns_project \
             WHERE in = type::thing('user', {uid}) \
               AND out = type::thing('cloud_project', {pid}) GROUP ALL",
            uid = qs(user_id),
            pid = qs(project_id),
        );
        let rows: Vec<CountRecord> = self.query_vec(&sql).await?;
        let count = rows.into_iter().next().map(|r| r.count).unwrap_or(0);
        if count == 0 {
            return Err("Access denied or project not found".to_string());
        }

        // 関係とプロジェクトを削除
        let sql = format!(
            "DELETE FROM owns_project \
             WHERE in = type::thing('user', {uid}) \
               AND out = type::thing('cloud_project', {pid});\
             DELETE FROM cloud_project \
             WHERE id = type::thing('cloud_project', {pid})",
            uid = qs(user_id),
            pid = qs(project_id),
        );
        self.execute(&sql).await?;
        Ok(())
    }
}

// ========== Internal record types for deserialization ==========

#[derive(Debug, Deserialize)]
struct ValueRecord {
    value: String,
}

#[derive(Debug, Deserialize)]
struct SettingKvRecord {
    setting_key: String,
    value: String,
}

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
            id: parse_record_id(&self.id),
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
struct CloudProjectRecord {
    data: String,
}

#[derive(Debug, Deserialize)]
struct ProjectSummaryRecord {
    id: String,
    name: String,
    updated_at: String,
}

#[derive(Debug, Deserialize)]
struct CountRecord {
    count: i64,
}

/// Escape and quote a string value for safe embedding in SurrealQL.
fn qs(s: &str) -> String {
    format!("'{}'", s.replace('\\', "\\\\").replace('\'', "\\'"))
}

/// Parse a SurrealDB record ID to extract the plain ID string.
/// Handles `"table:id"`, `"table:⟨id⟩"`, or plain `"id"` formats.
fn parse_record_id(raw: &str) -> String {
    let s = match raw.split_once(':') {
        Some((_, id)) => id,
        None => return raw.to_string(),
    };
    s.trim_start_matches('\u{27E8}')
        .trim_end_matches('\u{27E9}')
        .trim_start_matches('`')
        .trim_end_matches('`')
        .to_string()
}
