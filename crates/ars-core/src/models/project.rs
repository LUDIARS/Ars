use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ── Component ───────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Variable {
    pub name: String,
    #[serde(rename = "type")]
    pub var_type: String,
    #[serde(rename = "defaultValue", skip_serializing_if = "Option::is_none")]
    pub default_value: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortDefinition {
    pub name: String,
    #[serde(rename = "type")]
    pub port_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub name: String,
    pub description: String,
    pub inputs: Vec<PortDefinition>,
    pub outputs: Vec<PortDefinition>,
    #[serde(rename = "testCases", skip_serializing_if = "Option::is_none")]
    pub test_cases: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Component {
    pub id: String,
    pub name: String,
    pub category: String,
    pub domain: String,
    pub variables: Vec<Variable>,
    pub tasks: Vec<Task>,
    pub dependencies: Vec<String>,
}

// ── Actor ───────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Actor {
    pub id: String,
    pub name: String,
    pub role: String,
    pub components: Vec<String>,
    pub children: Vec<String>,
    pub position: Position,
    #[serde(rename = "parentId", skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
}

// ── Scene ───────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyBinding {
    pub id: String,
    pub key: String,
    pub description: String,
    #[serde(rename = "targetActorId", skip_serializing_if = "Option::is_none")]
    pub target_actor_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneState {
    pub id: String,
    pub name: String,
    #[serde(rename = "keyBindings")]
    pub key_bindings: Vec<KeyBinding>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scene {
    pub id: String,
    pub name: String,
    #[serde(rename = "rootActorId")]
    pub root_actor_id: String,
    pub actors: HashMap<String, Actor>,
    pub connections: Vec<Connection>,
    #[serde(default)]
    pub states: Vec<SceneState>,
    #[serde(rename = "activeStateId", default)]
    pub active_state_id: Option<String>,
}

// ── Project ─────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub name: String,
    pub scenes: HashMap<String, Scene>,
    pub components: HashMap<String, Component>,
    #[serde(rename = "activeSceneId")]
    pub active_scene_id: Option<String>,
}

// ── Summary (for listing) ───────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSummary {
    pub id: String,
    pub name: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}
