use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// ユーザー情報（Web APIレスポンス用）
///
/// フロントエンドの User 型と完全一致させる。
/// GitHub OAuth 前提で githubId を使用。
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct User {
    pub id: String,
    #[serde(rename = "githubId")]
    #[ts(type = "number")]
    pub github_id: i64,
    pub login: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    #[serde(rename = "avatarUrl")]
    pub avatar_url: String,
    pub email: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// セッション情報
///
/// ネイティブ: ~/.ars/session.json に永続保存。有効期限なし（同一PCで永続利用）。
/// Web: DynamoDB に保存。TTL付き。
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Session {
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    /// 有効期限（RFC3339）。ネイティブでは None = 無期限。
    #[serde(rename = "expiresAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    /// アクセストークン（GitHub token等）。
    /// セキュリティ注意: ファイルへの永続化時は serialize されない（skip_serializing）。
    /// Web版ではRedisにのみ保持。ネイティブ版ではOS Keychainへの移行を予定。
    #[serde(rename = "accessToken")]
    #[serde(default, skip_serializing)]
    pub access_token: String,
}
