/// Resource Depot モジュール（閲覧専用）
///
/// リソースの一覧・検索・詳細取得を読み取り専用APIとして提供する。
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::get,
    Router,
};
use serde::Deserialize;

use resource_depot_lib::models::resource::*;
use resource_depot_lib::services::ResourceDepotService;
use std::sync::{Arc, Mutex};

/// Resource Depot の共有状態
pub struct DepotAppState {
    pub depot: Mutex<ResourceDepotService>,
}

async fn api_get_all_resources(
    State(state): State<Arc<DepotAppState>>,
) -> Json<Vec<Resource>> {
    let depot = state.depot.lock().unwrap();
    Json(depot.get_all_resources())
}

#[derive(Deserialize)]
struct CategoryQuery {
    category: ResourceCategory,
}

async fn api_get_resources_by_category(
    State(state): State<Arc<DepotAppState>>,
    Query(q): Query<CategoryQuery>,
) -> Json<Vec<Resource>> {
    let depot = state.depot.lock().unwrap();
    Json(depot.get_resources_by_category(&q.category))
}

#[derive(Deserialize)]
struct SearchQuery {
    q: String,
}

async fn api_search_resources(
    State(state): State<Arc<DepotAppState>>,
    Query(q): Query<SearchQuery>,
) -> Json<Vec<Resource>> {
    let depot = state.depot.lock().unwrap();
    Json(depot.find_resources(&q.q))
}

async fn api_get_resource_by_id(
    State(state): State<Arc<DepotAppState>>,
    Path(resource_id): Path<String>,
) -> Result<Json<Resource>, (StatusCode, String)> {
    let depot = state.depot.lock().unwrap();
    depot
        .get_resource(&resource_id)
        .map(|r| Json(r.clone()))
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))
}

async fn api_get_bone_patterns(
    State(state): State<Arc<DepotAppState>>,
) -> Json<Vec<BonePattern>> {
    let depot = state.depot.lock().unwrap();
    Json(depot.get_bone_patterns())
}

async fn api_get_motion_groups(
    State(state): State<Arc<DepotAppState>>,
) -> Json<Vec<MotionGroup>> {
    let depot = state.depot.lock().unwrap();
    Json(depot.get_motion_groups())
}

async fn api_get_texture_groups(
    State(state): State<Arc<DepotAppState>>,
) -> Json<Vec<TextureGroup>> {
    let depot = state.depot.lock().unwrap();
    Json(depot.get_texture_groups())
}

async fn api_get_depot_state(
    State(state): State<Arc<DepotAppState>>,
) -> Json<ResourceDepot> {
    let depot = state.depot.lock().unwrap();
    Json(depot.get_depot().clone())
}

async fn api_find_duplicates(
    State(state): State<Arc<DepotAppState>>,
) -> Json<std::collections::HashMap<String, Vec<String>>> {
    let depot = state.depot.lock().unwrap();
    Json(depot.find_duplicate_resources())
}

/// Resource Depot モジュールのルーターを構築（閲覧専用）
pub fn router() -> Router {
    let depot_service = ResourceDepotService::with_defaults()
        .unwrap_or_else(|e| {
            eprintln!("Warning: Failed to init depot: {}", e);
            ResourceDepotService::new(std::env::temp_dir().join("ars").join("resource-depot"))
                .expect("Failed to initialize resource depot")
        });

    let state = Arc::new(DepotAppState {
        depot: Mutex::new(depot_service),
    });

    Router::new()
        .route("/api/depot/resources", get(api_get_all_resources))
        .route("/api/depot/resources/search", get(api_search_resources))
        .route("/api/depot/resources/by-category", get(api_get_resources_by_category))
        .route("/api/depot/resources/:resource_id", get(api_get_resource_by_id))
        .route("/api/depot/bone-patterns", get(api_get_bone_patterns))
        .route("/api/depot/motion-groups", get(api_get_motion_groups))
        .route("/api/depot/texture-groups", get(api_get_texture_groups))
        .route("/api/depot/state", get(api_get_depot_state))
        .route("/api/depot/duplicates", get(api_find_duplicates))
        .with_state(state)
}
