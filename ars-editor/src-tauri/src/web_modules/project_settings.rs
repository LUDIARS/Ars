/// プロジェクト設定モジュール
///
/// プロジェクトごとの設定をSurrealDB（ローカル組み込みDB）で管理するAPIルートを提供する。
/// 設定項目: 保存方法、参加ユーザ、Google Drive設定、resource-depot接続先など。
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use axum_extra::extract::cookie::CookieJar;
use serde::Deserialize;
use std::collections::HashMap;

use crate::app_state::AppState;
use crate::auth;

// ========== Request types ==========

#[derive(Deserialize)]
struct PutSettingRequest {
    value: String,
}

#[derive(Deserialize)]
struct PutSettingsBatchRequest {
    settings: HashMap<String, String>,
}

// ========== API handlers ==========

/// 全設定を取得
async fn api_get_all_settings(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(project_id): Path<String>,
) -> Result<Json<HashMap<String, String>>, (StatusCode, String)> {
    let _user = auth::extract_user(&state, &jar).await?;
    state
        .surreal
        .get_all_settings(&project_id)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

/// 個別設定を取得
async fn api_get_setting(
    State(state): State<AppState>,
    jar: CookieJar,
    Path((project_id, key)): Path<(String, String)>,
) -> Result<Json<Option<String>>, (StatusCode, String)> {
    let _user = auth::extract_user(&state, &jar).await?;
    state
        .surreal
        .get_setting(&project_id, &key)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

/// 個別設定を保存
async fn api_put_setting(
    State(state): State<AppState>,
    jar: CookieJar,
    Path((project_id, key)): Path<(String, String)>,
    Json(req): Json<PutSettingRequest>,
) -> Result<Json<()>, (StatusCode, String)> {
    let _user = auth::extract_user(&state, &jar).await?;
    state
        .surreal
        .put_setting(&project_id, &key, &req.value)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

/// 複数設定を一括保存
async fn api_put_settings_batch(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(project_id): Path<String>,
    Json(req): Json<PutSettingsBatchRequest>,
) -> Result<Json<()>, (StatusCode, String)> {
    let _user = auth::extract_user(&state, &jar).await?;
    state
        .surreal
        .put_settings_batch(&project_id, &req.settings)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

/// 個別設定を削除
async fn api_delete_setting(
    State(state): State<AppState>,
    jar: CookieJar,
    Path((project_id, key)): Path<(String, String)>,
) -> Result<Json<()>, (StatusCode, String)> {
    let _user = auth::extract_user(&state, &jar).await?;
    state
        .surreal
        .delete_setting(&project_id, &key)
        .await
        .map(|_| Json(()))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))
}

/// プロジェクト設定モジュールのルーターを構築
pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/settings/:project_id", get(api_get_all_settings))
        .route("/api/settings/:project_id/batch", post(api_put_settings_batch))
        .route(
            "/api/settings/:project_id/:key",
            get(api_get_setting)
                .put(api_put_setting)
                .delete(api_delete_setting),
        )
        .with_state(state)
}
