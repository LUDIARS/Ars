/// Redis を使った SessionRepository trait 実装
///
/// RedisClient をラップし、ars-core の SessionRepository に適合させる。
/// crate::models::Session は ars_core::models::Session の再エクスポートなので同一型。
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
        self.client
            .put_session(session)
            .await
            .map_err(ArsError::Storage)
    }

    async fn get(&self, session_id: &str) -> Result<Option<core_models::Session>> {
        self.client
            .get_session(session_id)
            .await
            .map_err(ArsError::Storage)
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
