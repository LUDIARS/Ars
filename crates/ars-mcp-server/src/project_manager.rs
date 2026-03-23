use ars_core::models::*;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug)]
pub struct ProjectManager {
    project_dir: PathBuf,
}

impl ProjectManager {
    pub fn new(project_dir: PathBuf) -> Self {
        Self { project_dir }
    }

    pub fn project_dir(&self) -> &Path {
        &self.project_dir
    }

    /// プロジェクトファイル(.ars.json)を検索
    pub fn find_project_files(&self) -> Vec<PathBuf> {
        let mut files = Vec::new();
        scan_dir(&self.project_dir, &mut files, 3);
        files
    }

    /// プロジェクトを読み込み
    pub fn load_project(&self, path: &Path) -> Result<Project, String> {
        let content = std::fs::read_to_string(path)
            .map_err(|e| format!("Failed to read project: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse project: {}", e))
    }

    /// プロジェクトを保存
    pub fn save_project(&self, path: &Path, project: &Project) -> Result<(), String> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir).map_err(|e| format!("Failed to create dir: {}", e))?;
        }
        let content = serde_json::to_string_pretty(project)
            .map_err(|e| format!("Failed to serialize: {}", e))?;
        std::fs::write(path, content)
            .map_err(|e| format!("Failed to write: {}", e))
    }

    /// 新規プロジェクト
    pub fn create_project(&self, name: &str) -> Project {
        Project {
            name: name.to_string(),
            scenes: HashMap::new(),
            components: HashMap::new(),
            prefabs: HashMap::new(),
            active_scene_id: None,
        }
    }

    /// シーン追加
    pub fn create_scene(&self, project: &mut Project, name: &str) -> Scene {
        let scene_id = uuid::Uuid::new_v4().to_string();
        let root_actor_id = uuid::Uuid::new_v4().to_string();

        let root_actor = Actor {
            id: root_actor_id.clone(),
            name: name.to_string(),
            role: "scene".to_string(),
            components: vec![],
            children: vec![],
            position: Position { x: 0.0, y: 0.0 },
            parent_id: None,
            sequences: vec![],
            sub_scene_id: None,
            prefab_id: None,
        };

        let mut actors = HashMap::new();
        actors.insert(root_actor_id.clone(), root_actor);

        let scene = Scene {
            id: scene_id.clone(),
            name: name.to_string(),
            root_actor_id,
            actors,
            connections: vec![],
            states: vec![],
            active_state_id: None,
        };

        project.scenes.insert(scene_id, scene.clone());
        if project.active_scene_id.is_none() {
            project.active_scene_id = Some(scene.id.clone());
        }
        scene
    }

    /// アクター追加
    pub fn add_actor(&self, project: &mut Project, scene_id: &str, name: &str, role: &str, x: f64, y: f64) -> Result<Actor, String> {
        let scene = project.scenes.get_mut(scene_id)
            .ok_or_else(|| format!("Scene not found: {}", scene_id))?;

        let actor = Actor {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.to_string(),
            role: role.to_string(),
            components: vec![],
            children: vec![],
            position: Position { x, y },
            parent_id: None,
            sequences: vec![],
            sub_scene_id: None,
            prefab_id: None,
        };

        scene.actors.insert(actor.id.clone(), actor.clone());
        Ok(actor)
    }

    /// コンポーネント作成
    pub fn create_component(&self, project: &mut Project, name: &str, category: &str, domain: &str, variables: Vec<Variable>, tasks: Vec<Task>, dependencies: Vec<String>) -> Component {
        let component = Component {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.to_string(),
            category: category.to_string(),
            domain: domain.to_string(),
            variables,
            tasks,
            dependencies,
            source_module_id: None,
        };

        project.components.insert(component.id.clone(), component.clone());
        component
    }

    /// コンポーネントをアクターにアタッチ
    pub fn attach_component(&self, project: &mut Project, scene_id: &str, actor_id: &str, component_id: &str) -> Result<(), String> {
        let scene = project.scenes.get_mut(scene_id)
            .ok_or_else(|| format!("Scene not found: {}", scene_id))?;
        let actor = scene.actors.get_mut(actor_id)
            .ok_or_else(|| format!("Actor not found: {}", actor_id))?;
        if !project.components.contains_key(component_id) {
            return Err(format!("Component not found: {}", component_id));
        }
        if !actor.components.contains(&component_id.to_string()) {
            actor.components.push(component_id.to_string());
        }
        Ok(())
    }

    /// 接続追加
    pub fn add_connection(&self, project: &mut Project, scene_id: &str, source_actor_id: &str, source_port: &str, target_actor_id: &str, target_port: &str) -> Result<Connection, String> {
        let scene = project.scenes.get_mut(scene_id)
            .ok_or_else(|| format!("Scene not found: {}", scene_id))?;

        if !scene.actors.contains_key(source_actor_id) {
            return Err(format!("Source actor not found: {}", source_actor_id));
        }
        if !scene.actors.contains_key(target_actor_id) {
            return Err(format!("Target actor not found: {}", target_actor_id));
        }

        let connection = Connection {
            id: uuid::Uuid::new_v4().to_string(),
            source_actor_id: source_actor_id.to_string(),
            source_port: source_port.to_string(),
            target_actor_id: target_actor_id.to_string(),
            target_port: target_port.to_string(),
        };

        scene.connections.push(connection.clone());
        Ok(connection)
    }

    /// プロジェクト概要
    pub fn summarize_project(&self, project: &Project) -> String {
        let scene_count = project.scenes.len();
        let component_count = project.components.len();
        let mut actor_count = 0;
        let mut connection_count = 0;
        for scene in project.scenes.values() {
            actor_count += scene.actors.len();
            connection_count += scene.connections.len();
        }

        let mut lines = vec![
            format!("# プロジェクト: {}", project.name),
            String::new(),
            "## 統計".into(),
            format!("- シーン数: {}", scene_count),
            format!("- コンポーネント数: {}", component_count),
            format!("- アクター数（全シーン合計）: {}", actor_count),
            format!("- 接続数（全シーン合計）: {}", connection_count),
        ];

        if scene_count > 0 {
            lines.push(String::new());
            lines.push("## シーン一覧".into());
            for scene in project.scenes.values() {
                let actors: Vec<_> = scene.actors.values().collect();
                let active = if project.active_scene_id.as_deref() == Some(&scene.id) { " (アクティブ)" } else { "" };
                lines.push(format!("- **{}**{}: アクター {}個, 接続 {}個", scene.name, active, actors.len(), scene.connections.len()));
                for actor in &actors {
                    lines.push(format!("  - {} [{}] コンポーネント: {}個", actor.name, actor.role, actor.components.len()));
                }
            }
        }

        if component_count > 0 {
            lines.push(String::new());
            lines.push("## コンポーネント一覧".into());
            let mut by_cat: HashMap<&str, Vec<&Component>> = HashMap::new();
            for comp in project.components.values() {
                by_cat.entry(&comp.category).or_default().push(comp);
            }
            for (cat, comps) in &by_cat {
                lines.push(format!("### {}", cat));
                for comp in comps {
                    lines.push(format!("- **{}** ({}): タスク {}個, 変数 {}個", comp.name, comp.domain, comp.tasks.len(), comp.variables.len()));
                }
            }
        }

        lines.join("\n")
    }
}

fn scan_dir(dir: &Path, results: &mut Vec<PathBuf>, depth: usize) {
    if depth == 0 { return; }
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        if name_str.starts_with('.') || name_str == "node_modules" || name_str == "dist" || name_str == "target" {
            continue;
        }
        let path = entry.path();
        if path.is_dir() {
            scan_dir(&path, results, depth - 1);
        } else if name_str.ends_with(".ars.json") {
            results.push(path);
        }
    }
}
