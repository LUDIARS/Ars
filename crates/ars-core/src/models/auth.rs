use serde::{Deserialize, Serialize};

/// ユーザー情報（ネイティブ/Web共通）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    /// 認証プロバイダ固有のID（GitHub IDなど）
    #[serde(rename = "providerId")]
    pub provider_id: String,
    /// 認証プロバイダ名 ("github", "local")
    pub provider: String,
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
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    /// 有効期限（RFC3339）。ネイティブでは None = 無期限。
    #[serde(rename = "expiresAt", skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    /// アクセストークン（GitHub token等）。ネイティブではKeychainに移す想定だが、
    /// 移行期はここに保持。
    #[serde(rename = "accessToken", default, skip_serializing_if = "String::is_empty")]
    pub access_token: String,
}
