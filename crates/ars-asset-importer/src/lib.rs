//! ars-asset-importer: Tier 1 プロキシ生成パイプライン
//!
//! Ars レベルエディタ向けアセット 2-Tier 戦略の ars 側実装。
//! インポート時に決定的に Tier 1 成果物を生成し、`data/<id>/` 配下へ保存する。
//!
//! ## Tier 構成
//!
//! - Tier 0: Manifest (起動時にロード)
//! - Tier 1: Preview Proxy — 簡略メッシュ + 凸包 + OBB + サムネ (配置時)
//! - Tier 2: Full Asset — 原メッシュ + PBR + GI (接近時/ビルド時)
//!
//! 本クレートは **Tier 1 の生成**を担当する。描画側の対応は Pictor#37 を参照。
//!
//! ## P1 スコープ (本コミット)
//!
//! - glTF ローダー
//! - AABB / OBB 算出
//! - source hash によるキャッシュ判定
//! - `data/<id>/` レイアウト書き出し
//!
//! P2 以降 (meshopt simplify / 凸包 / サムネ) は stub として存在する。

pub mod error;
pub mod hull;
pub mod loaders;
pub mod obb;
pub mod pipeline;
pub mod schema;
pub mod simplify;
pub mod thumbnail;

pub use error::{AssetImporterError, Result};
pub use pipeline::{process, ProcessOutcome};
pub use schema::{AssetId, AssetMeta, Bounds, OrientedBox};
