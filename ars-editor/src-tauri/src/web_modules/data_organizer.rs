/// Data Organizer モジュール（閲覧 + 調整）
///
/// マスターデータのスキーマ・エントリ管理、ユーザーデータの変数管理、
/// エクスポート・インポート機能を提供する。
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::Deserialize;

use data_organizer::organizer::DataOrganizer;
use data_organizer::schema::DataSchema;
use data_organizer::master_data::MasterDataEntry;
use data_organizer::user_data::UserVariable;
use std::sync::{Arc, Mutex};

/// Data Organizer の共有状態
pub struct OrganizerAppState {
    pub organizer: Mutex<DataOrganizer>,
    pub data_dir: std::path::PathBuf,
}

impl OrganizerAppState {
    fn save_organizer(&self, organizer: &DataOrganizer) -> Result<(), (StatusCode, String)> {
        organizer
            .save(&self.data_dir)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
    }
}

// ========== スキーマ API ==========

async fn api_get_schemas(
    State(state): State<Arc<OrganizerAppState>>,
) -> Json<Vec<DataSchema>> {
    let org = state.organizer.lock().unwrap();
    Json(org.master_data().schemas().cloned().collect())
}

async fn api_get_schema(
    State(state): State<Arc<OrganizerAppState>>,
    Path(schema_id): Path<String>,
) -> Result<Json<DataSchema>, (StatusCode, String)> {
    let org = state.organizer.lock().unwrap();
    org.master_data()
        .get_schema(&schema_id)
        .map(|s| Json(s.clone()))
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))
}

async fn api_create_schema(
    State(state): State<Arc<OrganizerAppState>>,
    Json(schema): Json<DataSchema>,
) -> Result<Json<DataSchema>, (StatusCode, String)> {
    let mut org = state.organizer.lock().unwrap();
    let schema_clone = schema.clone();
    org.master_data_mut()
        .register_schema(schema)
        .map_err(|e| (StatusCode::CONFLICT, e.to_string()))?;
    state.save_organizer(&org)?;
    Ok(Json(schema_clone))
}

// ========== エントリ API ==========

async fn api_get_entries(
    State(state): State<Arc<OrganizerAppState>>,
    Path(schema_id): Path<String>,
) -> Result<Json<Vec<MasterDataEntry>>, (StatusCode, String)> {
    let org = state.organizer.lock().unwrap();
    org.master_data()
        .get_entries(&schema_id)
        .map(|entries| Json(entries.into_iter().cloned().collect()))
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))
}

async fn api_get_entry(
    State(state): State<Arc<OrganizerAppState>>,
    Path((schema_id, entry_id)): Path<(String, String)>,
) -> Result<Json<MasterDataEntry>, (StatusCode, String)> {
    let org = state.organizer.lock().unwrap();
    org.master_data()
        .get_entry(&schema_id, &entry_id)
        .map(|e| Json(e.clone()))
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))
}

#[derive(Deserialize)]
struct CreateEntryRequest {
    entry_id: String,
    actor_id: Option<String>,
}

async fn api_create_entry(
    State(state): State<Arc<OrganizerAppState>>,
    Path(schema_id): Path<String>,
    Json(req): Json<CreateEntryRequest>,
) -> Result<Json<MasterDataEntry>, (StatusCode, String)> {
    let mut org = state.organizer.lock().unwrap();
    let entry = org
        .master_data_mut()
        .add_entry(&schema_id, req.entry_id, req.actor_id)
        .map(|e| e.clone())
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    state.save_organizer(&org)?;
    Ok(Json(entry))
}

#[derive(Deserialize)]
struct UpdateFieldRequest {
    field: String,
    value: serde_json::Value,
}

async fn api_update_entry_field(
    State(state): State<Arc<OrganizerAppState>>,
    Path((schema_id, entry_id)): Path<(String, String)>,
    Json(req): Json<UpdateFieldRequest>,
) -> Result<Json<MasterDataEntry>, (StatusCode, String)> {
    let mut org = state.organizer.lock().unwrap();
    org.master_data_mut()
        .update_entry_field(&schema_id, &entry_id, &req.field, req.value)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    let entry = org
        .master_data()
        .get_entry(&schema_id, &entry_id)
        .map(|e| Json(e.clone()))
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))?;
    state.save_organizer(&org)?;
    Ok(entry)
}

// ========== ユーザーデータ API ==========

async fn api_get_variables(
    State(state): State<Arc<OrganizerAppState>>,
) -> Json<Vec<UserVariable>> {
    let org = state.organizer.lock().unwrap();
    Json(org.user_data().persistent_variables().into_iter().cloned().collect())
}

#[derive(Deserialize)]
struct ActorQuery {
    actor_id: Option<String>,
}

async fn api_get_variables_by_actor(
    State(state): State<Arc<OrganizerAppState>>,
    Query(q): Query<ActorQuery>,
) -> Json<Vec<UserVariable>> {
    let org = state.organizer.lock().unwrap();
    if let Some(actor_id) = &q.actor_id {
        Json(org.user_data().variables_for_actor(actor_id).into_iter().cloned().collect())
    } else {
        Json(vec![])
    }
}

async fn api_register_variable(
    State(state): State<Arc<OrganizerAppState>>,
    Json(var): Json<UserVariable>,
) -> Result<Json<UserVariable>, (StatusCode, String)> {
    let mut org = state.organizer.lock().unwrap();
    let var_clone = var.clone();
    org.user_data_mut()
        .register_variable(var)
        .map_err(|e| (StatusCode::CONFLICT, e.to_string()))?;
    state.save_organizer(&org)?;
    Ok(Json(var_clone))
}

#[derive(Deserialize)]
struct SetVariableRequest {
    name: String,
    actor_id: Option<String>,
    value: serde_json::Value,
}

async fn api_set_variable(
    State(state): State<Arc<OrganizerAppState>>,
    Json(req): Json<SetVariableRequest>,
) -> Result<Json<()>, (StatusCode, String)> {
    let mut org = state.organizer.lock().unwrap();
    org.user_data_mut()
        .set_variable(&req.name, req.actor_id.as_deref(), req.value)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    state.save_organizer(&org)?;
    Ok(Json(()))
}

// ========== エクスポート / インポート API ==========

async fn api_export(
    State(state): State<Arc<OrganizerAppState>>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let org = state.organizer.lock().unwrap();
    let json_str = org
        .export_json()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let value: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(value))
}

async fn api_import(
    State(state): State<Arc<OrganizerAppState>>,
    Json(data): Json<serde_json::Value>,
) -> Result<Json<()>, (StatusCode, String)> {
    let json_str = serde_json::to_string(&data)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    let new_org = DataOrganizer::import_json(&json_str)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
    let mut org = state.organizer.lock().unwrap();
    *org = new_org;
    state.save_organizer(&org)?;
    Ok(Json(()))
}

/// Data Organizer モジュールのルーターを構築（閲覧 + 調整）
pub fn router() -> Router {
    let data_dir = dirs::home_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join(".ars")
        .join("data-organizer");

    std::fs::create_dir_all(&data_dir).ok();

    let organizer = DataOrganizer::load(&data_dir).unwrap_or_else(|_| {
        println!("No existing data found, starting fresh.");
        DataOrganizer::new()
    });

    let state = Arc::new(OrganizerAppState {
        organizer: Mutex::new(organizer),
        data_dir,
    });

    Router::new()
        // スキーマ
        .route("/api/data/schemas", get(api_get_schemas).post(api_create_schema))
        .route("/api/data/schemas/:schema_id", get(api_get_schema))
        // エントリ
        .route(
            "/api/data/schemas/:schema_id/entries",
            get(api_get_entries).post(api_create_entry),
        )
        .route(
            "/api/data/schemas/:schema_id/entries/:entry_id",
            get(api_get_entry).post(api_update_entry_field),
        )
        // ユーザーデータ
        .route("/api/data/variables", get(api_get_variables).post(api_register_variable))
        .route("/api/data/variables/update", post(api_set_variable))
        .route("/api/data/variables/by-actor", get(api_get_variables_by_actor))
        // エクスポート / インポート
        .route("/api/data/export", get(api_export))
        .route("/api/data/import", post(api_import))
        .with_state(state)
}
