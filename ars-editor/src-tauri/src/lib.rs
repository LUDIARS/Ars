pub mod commands;
pub mod models;
#[cfg(feature = "web-server")]
pub mod app_state;
#[cfg(feature = "web-server")]
pub mod auth;
#[cfg(feature = "web-server")]
pub mod git_ops;
#[cfg(feature = "web-server")]
pub mod web_server;
#[cfg(feature = "web-server")]
pub mod web_modules;
#[cfg(feature = "web-server")]
pub mod collab;
#[cfg(feature = "web-server")]
pub mod surrealdb_client;
#[cfg(feature = "web-server")]
pub mod redis_client;
#[cfg(feature = "web-server")]
pub mod surreal_repo;
#[cfg(feature = "web-server")]
pub mod redis_repo;

#[cfg(feature = "tauri-app")]
pub fn run() {
    use std::sync::Arc;
    use ars_core::repository::{ProjectRepository, SessionRepository, UserRepository};

    // ローカルファイルベースのRepository実装を注入
    let project_repo: Arc<dyn ProjectRepository> = Arc::new(
        ars_project::LocalProjectRepository::with_defaults()
            .expect("Failed to initialize project repository"),
    );
    let user_repo: Arc<dyn UserRepository> = Arc::new(
        ars_project::LocalUserRepository::with_defaults()
            .expect("Failed to initialize user repository"),
    );
    let session_repo: Arc<dyn SessionRepository> = Arc::new(
        ars_project::LocalSessionRepository::with_defaults()
            .expect("Failed to initialize session repository"),
    );

    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .manage(project_repo)
        .manage(user_repo)
        .manage(session_repo)
        .invoke_handler(tauri::generate_handler![
            commands::save_project,
            commands::load_project,
            commands::get_default_project_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
