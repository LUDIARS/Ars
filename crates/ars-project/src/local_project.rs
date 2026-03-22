use std::fs;
use std::path::PathBuf;

use async_trait::async_trait;

use ars_core::error::{ArsError, Result};
use ars_core::models::{Project, ProjectSummary};
use ars_core::repository::ProjectRepository;

/// ローカルファイルシステムベースのプロジェクトリポジトリ
///
/// ストレージ構造:
/// ```text
/// {base_dir}/
///   {project-id}/
///     project.json
/// ```
pub struct LocalProjectRepository {
    base_dir: PathBuf,
}

impl LocalProjectRepository {
    pub fn new(base_dir: PathBuf) -> Self {
        Self { base_dir }
    }

    /// デフォルトパス: ~/.ars/projects/
    pub fn with_defaults() -> Result<Self> {
        let base = dirs::home_dir()
            .ok_or_else(|| ArsError::Storage("Cannot determine home directory".into()))?
            .join(".ars")
            .join("projects");
        fs::create_dir_all(&base)?;
        Ok(Self::new(base))
    }

    fn project_path(&self, project_id: &str) -> PathBuf {
        self.base_dir.join(project_id).join("project.json")
    }
}

#[async_trait]
impl ProjectRepository for LocalProjectRepository {
    async fn save(&self, _user_id: &str, project_id: &str, project: &Project) -> Result<()> {
        let path = self.project_path(project_id);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_string_pretty(project)?;
        fs::write(&path, json)?;

        // メタデータ更新
        let meta_path = self.base_dir.join(project_id).join("meta.json");
        let meta = serde_json::json!({
            "id": project_id,
            "name": project.name,
            "updatedAt": chrono::Utc::now().to_rfc3339(),
        });
        fs::write(&meta_path, serde_json::to_string_pretty(&meta)?)?;
        Ok(())
    }

    async fn load(&self, _user_id: &str, project_id: &str) -> Result<Option<Project>> {
        let path = self.project_path(project_id);
        if !path.exists() {
            return Ok(None);
        }
        let content = fs::read_to_string(&path)?;
        let project: Project = serde_json::from_str(&content)?;
        Ok(Some(project))
    }

    async fn list(&self, _user_id: &str) -> Result<Vec<ProjectSummary>> {
        let mut projects = Vec::new();
        if !self.base_dir.exists() {
            return Ok(projects);
        }
        for entry in fs::read_dir(&self.base_dir)? {
            let entry = entry?;
            if !entry.file_type()?.is_dir() {
                continue;
            }
            let meta_path = entry.path().join("meta.json");
            if meta_path.exists() {
                let content = fs::read_to_string(&meta_path)?;
                if let Ok(summary) = serde_json::from_str::<ProjectSummary>(&content) {
                    projects.push(summary);
                }
            } else {
                // meta.json がなくても project.json があればリストに含める
                let project_path = entry.path().join("project.json");
                if project_path.exists() {
                    let id = entry.file_name().to_string_lossy().to_string();
                    if let Ok(content) = fs::read_to_string(&project_path) {
                        if let Ok(project) = serde_json::from_str::<Project>(&content) {
                            projects.push(ProjectSummary {
                                id,
                                name: project.name,
                                updated_at: String::new(),
                            });
                        }
                    }
                }
            }
        }
        projects.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        Ok(projects)
    }

    async fn delete(&self, _user_id: &str, project_id: &str) -> Result<()> {
        let dir = self.base_dir.join(project_id);
        if dir.exists() {
            fs::remove_dir_all(&dir)?;
        }
        Ok(())
    }
}
