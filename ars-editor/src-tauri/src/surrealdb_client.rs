/// SurrealDB 組み込みデータベースサービス
///
/// プロジェクト設定などのローカルデータをSurrealDBで管理する。
/// RocksDBバックエンドで永続化。
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use surrealdb::engine::local::RocksDb;
use surrealdb::Surreal;

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

impl SurrealClient {
    pub async fn new(data_dir: &str) -> Result<Self, String> {
        let db = Surreal::new::<RocksDb>(data_dir)
            .await
            .map_err(|e| format!("SurrealDB init failed: {}", e))?;

        db.use_ns("ars")
            .use_db("project")
            .await
            .map_err(|e| format!("SurrealDB namespace setup failed: {}", e))?;

        // project_id + setting_key のユニークインデックスを作成
        db.query("DEFINE INDEX IF NOT EXISTS idx_setting_lookup ON project_setting FIELDS project_id, setting_key UNIQUE")
            .await
            .map_err(|e| format!("SurrealDB index creation failed: {}", e))?;

        Ok(Self { db })
    }

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
}
