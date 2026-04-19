//! アセットフォーマット別のローダー。
//!
//! すべてのローダーは共通中間表現 [`MeshData`] を返す。
//! 以降のパイプライン (AABB/OBB/simplify/hull) は MeshData だけを入力に取る。

pub mod gltf;

use glam::Vec3;

/// フォーマット非依存のメッシュ中間表現。
///
/// 複数メッシュを含む原アセットは、インポート時に統合 (merge) される。
/// Tier 1 は「形状プレビュー」が目的なので、グループ情報は保持しない。
#[derive(Debug, Default, Clone)]
pub struct MeshData {
    pub name: String,
    pub positions: Vec<Vec3>,
    /// 三角形インデックス (3 要素で 1 三角形)。空の場合は non-indexed。
    pub indices: Vec<u32>,
}

impl MeshData {
    pub fn triangle_count(&self) -> u32 {
        if self.indices.is_empty() {
            (self.positions.len() / 3) as u32
        } else {
            (self.indices.len() / 3) as u32
        }
    }

    pub fn vertex_count(&self) -> u32 {
        self.positions.len() as u32
    }

    pub fn is_empty(&self) -> bool {
        self.positions.is_empty()
    }
}

/// ファイル拡張子から loader をディスパッチ。
pub fn load(path: &std::path::Path) -> crate::Result<MeshData> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    match ext.as_str() {
        "gltf" | "glb" => gltf::load(path),
        other => Err(crate::AssetImporterError::UnsupportedFormat(other.to_string())),
    }
}
