use std::sync::Arc;

use ars_core::repository::{ProjectRepository, SessionRepository, UserRepository};

use crate::dynamo::DynamoClient;
use crate::dynamo_repo::{DynamoProjectRepository, DynamoSessionRepository, DynamoUserRepository};

#[derive(Clone)]
pub struct AppState {
    pub github_client_id: String,
    pub github_client_secret: String,
    pub github_redirect_uri: String,
    pub dynamo: DynamoClient,
    // Repository trait objects
    pub project_repo: Arc<dyn ProjectRepository>,
    pub user_repo: Arc<dyn UserRepository>,
    pub session_repo: Arc<dyn SessionRepository>,
}

impl AppState {
    pub async fn from_env() -> Self {
        let dynamo = DynamoClient::new().await;
        let project_repo: Arc<dyn ProjectRepository> =
            Arc::new(DynamoProjectRepository::new(dynamo.clone()));
        let user_repo: Arc<dyn UserRepository> =
            Arc::new(DynamoUserRepository::new(dynamo.clone()));
        let session_repo: Arc<dyn SessionRepository> =
            Arc::new(DynamoSessionRepository::new(dynamo.clone()));
        Self {
            github_client_id: std::env::var("GITHUB_CLIENT_ID")
                .expect("GITHUB_CLIENT_ID must be set"),
            github_client_secret: std::env::var("GITHUB_CLIENT_SECRET")
                .expect("GITHUB_CLIENT_SECRET must be set"),
            github_redirect_uri: std::env::var("GITHUB_REDIRECT_URI")
                .unwrap_or_else(|_| "http://localhost:5173/auth/github/callback".to_string()),
            dynamo,
            project_repo,
            user_repo,
            session_repo,
        }
    }
}
