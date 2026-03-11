use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post},
    Router,
};
use axum_extra::extract::cookie::CookieJar;
use serde::Deserialize;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

use crate::app_state::AppState;
use crate::auth;
use crate::commands::project::{
    get_default_project_path_impl, list_projects_impl, load_project_impl, save_project_impl,
};
use crate::models::Project;

#[derive(Deserialize)]
struct SaveRequest {
    path: String,
    project: Project,
}

#[derive(Deserialize)]
struct LoadQuery {
    path: String,
}

// ========== Local file-based APIs (backward-compatible) ==========

async fn api_save_project(
    Json(req): Json<SaveRequest>,
) -> Result<Json<()>, (StatusCode, String)> {
    save_project_impl(req.path, req.project)
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

async fn api_load_project(
    Query(q): Query<LoadQuery>,
) -> Result<Json<Project>, (StatusCode, String)> {
    load_project_impl(q.path)
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

async fn api_default_path() -> Result<Json<String>, (StatusCode, String)> {
    get_default_project_path_impl()
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

async fn api_list_projects() -> Result<Json<Vec<String>>, (StatusCode, String)> {
    list_projects_impl()
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

// ========== DynamoDB-backed cloud project APIs ==========

#[derive(Deserialize)]
struct CloudSaveRequest {
    #[serde(rename = "projectId")]
    project_id: String,
    project: Project,
}

async fn api_cloud_save_project(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(req): Json<CloudSaveRequest>,
) -> Result<Json<()>, (StatusCode, String)> {
    let user = auth::extract_user(&state, &jar).await?;
    state
        .dynamo
        .save_project(&user.id, &req.project_id, &req.project)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

#[derive(Deserialize)]
struct CloudLoadQuery {
    #[serde(rename = "projectId")]
    project_id: String,
}

async fn api_cloud_load_project(
    State(state): State<AppState>,
    jar: CookieJar,
    Query(q): Query<CloudLoadQuery>,
) -> Result<Json<Project>, (StatusCode, String)> {
    let user = auth::extract_user(&state, &jar).await?;
    state
        .dynamo
        .load_project(&user.id, &q.project_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?
        .map(Json)
        .ok_or((StatusCode::NOT_FOUND, "Project not found".to_string()))
}

async fn api_cloud_list_projects(
    State(state): State<AppState>,
    jar: CookieJar,
) -> Result<Json<Vec<crate::dynamo::ProjectSummary>>, (StatusCode, String)> {
    let user = auth::extract_user(&state, &jar).await?;
    state
        .dynamo
        .list_user_projects(&user.id)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

async fn api_cloud_delete_project(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(project_id): Path<String>,
) -> Result<Json<()>, (StatusCode, String)> {
    let user = auth::extract_user(&state, &jar).await?;
    state
        .dynamo
        .delete_project(&user.id, &project_id)
        .await
        .map(|_| Json(()))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

pub fn api_router(state: AppState) -> Router {
    Router::new()
        // Local file-based APIs (no auth required)
        .route("/api/project/save", post(api_save_project))
        .route("/api/project/load", get(api_load_project))
        .route("/api/project/default-path", get(api_default_path))
        .route("/api/project/list", get(api_list_projects))
        // Auth routes
        .route("/auth/github/login", get(auth::github_login))
        .route("/auth/github/callback", get(auth::github_callback))
        .route("/auth/me", get(auth::get_me))
        .route("/auth/logout", post(auth::logout))
        // Cloud project APIs (auth required)
        .route("/api/cloud/project/save", post(api_cloud_save_project))
        .route("/api/cloud/project/load", get(api_cloud_load_project))
        .route("/api/cloud/project/list", get(api_cloud_list_projects))
        .route("/api/cloud/project/:project_id", delete(api_cloud_delete_project))
        .layer(CorsLayer::permissive())
        .with_state(state)
}

pub async fn serve(port: u16, static_dir: Option<String>) {
    let state = AppState::from_env().await;
    let app = if let Some(dir) = static_dir {
        api_router(state).fallback_service(ServeDir::new(dir))
    } else {
        api_router(state)
    };

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    println!("Ars Editor web server listening on http://localhost:{}", port);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
