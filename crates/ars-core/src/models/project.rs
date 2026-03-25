use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ts_rs::TS;

// ── Component ───────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Variable {
    pub name: String,
    #[serde(rename = "type")]
    pub var_type: String,
    #[serde(rename = "defaultValue")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_value: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PortDefinition {
    pub name: String,
    #[serde(rename = "type")]
    pub port_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Task {
    pub name: String,
    pub description: String,
    pub inputs: Vec<PortDefinition>,
    pub outputs: Vec<PortDefinition>,
    #[serde(rename = "testCases")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub test_cases: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Component {
    pub id: String,
    pub name: String,
    pub category: String,
    pub domain: String,
    pub variables: Vec<Variable>,
    pub tasks: Vec<Task>,
    pub dependencies: Vec<String>,
    /// MCP server 用: インポート元モジュールID
    #[serde(rename = "sourceModuleId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_module_id: Option<String>,
}

// ── Actor ───────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SequenceStep {
    pub id: String,
    pub name: String,
    pub description: String,
    pub order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Actor {
    pub id: String,
    pub name: String,
    pub role: String,
    pub components: Vec<String>,
    pub children: Vec<String>,
    pub position: Position,
    #[serde(rename = "parentId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(default)]
    pub sequences: Vec<SequenceStep>,
    #[serde(rename = "subSceneId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub_scene_id: Option<String>,
    #[serde(rename = "prefabId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prefab_id: Option<String>,
}

// ── Prefab ──────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct PrefabActor {
    pub name: String,
    pub role: String,
    pub components: Vec<String>,
    pub children: Vec<String>,
    #[serde(default)]
    pub sequences: Vec<SequenceStep>,
    #[serde(rename = "subSceneId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub_scene_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Prefab {
    pub id: String,
    pub name: String,
    pub actor: PrefabActor,
}

// ── Scene ───────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Connection {
    pub id: String,
    #[serde(rename = "sourceActorId")]
    pub source_actor_id: String,
    #[serde(rename = "sourcePort")]
    pub source_port: String,
    #[serde(rename = "targetActorId")]
    pub target_actor_id: String,
    #[serde(rename = "targetPort")]
    pub target_port: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct KeyBinding {
    pub id: String,
    pub key: String,
    pub description: String,
    #[serde(rename = "targetActorId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_actor_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SceneState {
    pub id: String,
    pub name: String,
    #[serde(rename = "keyBindings")]
    pub key_bindings: Vec<KeyBinding>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Scene {
    pub id: String,
    pub name: String,
    #[serde(rename = "rootActorId")]
    pub root_actor_id: String,
    #[ts(type = "Record<string, Actor>")]
    pub actors: HashMap<String, Actor>,
    pub connections: Vec<Connection>,
    #[serde(default)]
    pub states: Vec<SceneState>,
    #[serde(rename = "activeStateId")]
    #[serde(default)]
    pub active_state_id: Option<String>,
}

// ── Project ─────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Project {
    pub name: String,
    #[ts(type = "Record<string, Scene>")]
    pub scenes: HashMap<String, Scene>,
    #[ts(type = "Record<string, Component>")]
    pub components: HashMap<String, Component>,
    #[serde(default)]
    #[ts(type = "Record<string, Prefab>")]
    pub prefabs: HashMap<String, Prefab>,
    #[serde(rename = "activeSceneId")]
    pub active_scene_id: Option<String>,
}

// ── Summary (for listing) ───────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ProjectSummary {
    pub id: String,
    pub name: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

// ── Installed Module ────────────────────────────────

/// Gitリポジトリからインストールされたモジュールの管理情報
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct InstalledModule {
    pub id: String,
    /// モジュール名
    pub name: String,
    /// Git clone URL
    #[serde(rename = "gitUrl")]
    pub git_url: String,
    /// ブランチまたはタグ
    #[serde(rename = "gitRef")]
    #[serde(default = "default_git_ref")]
    pub git_ref: String,
    /// ローカルのクローン先パス
    #[serde(rename = "localPath")]
    pub local_path: String,
    /// インストール日時 (RFC3339)
    #[serde(rename = "installedAt")]
    pub installed_at: String,
    /// 最終更新日時 (RFC3339)
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    /// 有効/無効
    pub enabled: bool,
    /// リポジトリの説明
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

fn default_git_ref() -> String {
    "main".to_string()
}

/// インストール済みモジュール一覧を管理する設定ファイル
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ModuleRegistry {
    pub modules: Vec<InstalledModule>,
}

// ── Git ─────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct GitRepo {
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub html_url: String,
    pub clone_url: String,
    #[serde(rename = "private")]
    pub is_private: bool,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct GitProjectInfo {
    pub repo_full_name: String,
    pub branch: String,
    pub has_project: bool,
    pub local_path: String,
}
