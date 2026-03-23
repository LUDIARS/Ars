/// Redis を使った SessionRepository trait 実装
///
/// RedisClient をラップし、ars-core の SessionRepository に適合させる。
use async_trait::async_trait;

use ars_core::error::{ArsError, Result};
use ars_core::models as core_models;
use ars_core::repository::SessionRepository;

use crate::redis_client::RedisClient;

pub struct RedisSessionRepository {
    client: RedisClient,
}

impl RedisSessionRepository {
    pub fn new(client: RedisClient) -> Self {
        Self { client }
    }
}

#[async_trait]
impl SessionRepository for RedisSessionRepository {
    async fn put(&self, session: &core_models::Session) -> Result<()> {
        let local_session = to_local_session(session);
        self.client
            .put_session(&local_session)
            .await
            .map_err(ArsError::Storage)
    }

    async fn get(&self, session_id: &str) -> Result<Option<core_models::Session>> {
        let result = self.client
            .get_session(session_id)
            .await
            .map_err(ArsError::Storage)?;
        Ok(result.map(|s| to_core_session(&s)))
    }

    async fn delete(&self, session_id: &str) -> Result<()> {
        self.client
            .delete_session(session_id)
            .await
            .map_err(ArsError::Storage)
    }

    async fn get_active(&self) -> Result<Option<core_models::Session>> {
        // Webモードでは cookie からセッションIDを取るため、
        // この関数は使われない。get() を使う。
        Ok(None)
    }
}

// ── 型変換ヘルパー ──────────────────────────────────

fn to_local_session(s: &core_models::Session) -> crate::auth::Session {
    crate::auth::Session {
        id: s.id.clone(),
        user_id: s.user_id.clone(),
        expires_at: s.expires_at.clone().unwrap_or_default(),
        created_at: s.created_at.clone(),
        access_token: s.access_token.clone(),
    }
}

fn to_core_session(s: &crate::auth::Session) -> core_models::Session {
    core_models::Session {
        id: s.id.clone(),
        user_id: s.user_id.clone(),
        expires_at: if s.expires_at.is_empty() {
            None
        } else {
            Some(s.expires_at.clone())
        },
        created_at: s.created_at.clone(),
        access_token: s.access_token.clone(),
    }
}
