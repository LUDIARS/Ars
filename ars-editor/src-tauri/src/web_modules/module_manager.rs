/// モジュール管理モジュール
///
/// Gitリポジトリからモジュールをインストール・管理するAPIルートを提供する。
/// 設定画面からインストール済みモジュールの一覧表示・有効無効切替・更新・削除が可能。
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{delete, get, post, put},
    Router,
};
use axum_extra::extract::cookie::CookieJar;
use serde::Deserialize;

use crate::app_state::AppState;
use crate::auth;
use crate::git_module_ops;
use crate::models::InstalledModule;

// ========== Request types ==========

#[derive(Deserialize)]
struct InstallModuleRequest {
    /// Git clone URL (e.g. "https://github.com/user/ars-module-foo.git")
    #[serde(rename = "gitUrl")]
    git_url: String,
    /// Branch or tag (default: "main")
    #[serde(rename = "gitRef")]
    git_ref: Option<String>,
}

#[derive(Deserialize)]
struct SetEnabledRequest {
    enabled: bool,
}

// ========== API handlers ==========

/// インストール済みモジュール一覧を取得
async fn api_list_modules(
    State(state): State<AppState>,
    jar: CookieJar,
) -> Result<Json<Vec<InstalledModule>>, (StatusCode, String)> {
    let _session = auth::extract_session(&state, &jar).await?;

    let modules = tokio::task::spawn_blocking(git_module_ops::list_installed_modules)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Task failed: {}", e)))?;

    Ok(Json(modules))
}

/// Gitリポジトリからモジュールをインストール
async fn api_install_module(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(req): Json<InstallModuleRequest>,
) -> Result<Json<InstalledModule>, (StatusCode, String)> {
    let session = auth::extract_session(&state, &jar).await?;
    let token = session.access_token.clone();
    let git_url = req.git_url;
    let git_ref = req.git_ref.unwrap_or_else(|| "main".to_string());

    let module = tokio::task::spawn_blocking(move || {
        git_module_ops::install_module(&token, &git_url, &git_ref)
    })
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Task failed: {}", e)))?
    .map_err(|e| (StatusCode::BAD_REQUEST, e))?;

    Ok(Json(module))
}

/// モジュールを更新（git pull）
async fn api_update_module(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(module_id): Path<String>,
) -> Result<Json<InstalledModule>, (StatusCode, String)> {
    let session = auth::extract_session(&state, &jar).await?;
    let token = session.access_token.clone();

    let module = tokio::task::spawn_blocking(move || {
        git_module_ops::update_module(&token, &module_id)
    })
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Task failed: {}", e)))?
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(module))
}

/// モジュールをアンインストール
async fn api_uninstall_module(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(module_id): Path<String>,
) -> Result<Json<()>, (StatusCode, String)> {
    let _session = auth::extract_session(&state, &jar).await?;

    tokio::task::spawn_blocking(move || git_module_ops::uninstall_module(&module_id))
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Task failed: {}", e)))?
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(()))
}

/// モジュールの有効/無効を切り替え
async fn api_set_module_enabled(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(module_id): Path<String>,
    Json(req): Json<SetEnabledRequest>,
) -> Result<Json<InstalledModule>, (StatusCode, String)> {
    let _session = auth::extract_session(&state, &jar).await?;

    let module = tokio::task::spawn_blocking(move || {
        git_module_ops::set_module_enabled(&module_id, req.enabled)
    })
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Task failed: {}", e)))?
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(module))
}

/// モジュール内のMarkdownファイル一覧を取得
async fn api_list_module_files(
    State(state): State<AppState>,
    jar: CookieJar,
    Path(module_id): Path<String>,
) -> Result<Json<Vec<String>>, (StatusCode, String)> {
    let _session = auth::extract_session(&state, &jar).await?;

    let files = tokio::task::spawn_blocking(move || {
        git_module_ops::list_module_files(&module_id)
    })
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Task failed: {}", e)))?
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(files))
}

/// モジュール管理のルーターを構築
pub fn router(state: AppState) -> Router {
    Router::new()
        .route(
            "/api/modules",
            get(api_list_modules).post(api_install_module),
        )
        .route(
            "/api/modules/:module_id",
            delete(api_uninstall_module),
        )
        .route(
            "/api/modules/:module_id/update",
            post(api_update_module),
        )
        .route(
            "/api/modules/:module_id/enabled",
            put(api_set_module_enabled),
        )
        .route(
            "/api/modules/:module_id/files",
            get(api_list_module_files),
        )
        .with_state(state)
}
