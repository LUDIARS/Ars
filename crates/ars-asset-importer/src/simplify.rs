//! メッシュ簡略化 (P2)
//!
//! `meshopt` (Arseny Kapoulkine) の simplification API で原メッシュを decimate し、
//! 目標 triangle 数以下のプロキシメッシュを生成する。
//!
//! `meshopt::simplify` は擬似乱数を使わない決定的アルゴリズムなので、
//! 同一入力 + 同一バージョンで常に同一バイト列の結果を返す。

use meshopt::{SimplifyOptions, VertexDataAdapter};

use crate::loaders::MeshData;

/// 簡略化の上限 triangle 数 (Tier 1 仕様: < 256 tri を目標)。
pub const DEFAULT_TARGET_TRIANGLES: u32 = 256;

/// 許容誤差 (絶対値)。`meshopt::simplify` の `target_error`。
///
/// 0.05 は「モデル直径の 5%」相当の誤差を許容することを意味する。
/// プレビュー目的なので過度に小さくしない (収束しないと target に届かない)。
pub const DEFAULT_TARGET_ERROR: f32 = 0.05;

/// `mesh` を `target_triangles` 以下まで簡略化した新しい [`MeshData`] を返す。
///
/// 入力が既に target 以下の場合は (再構築無しで) クローンを返す。
/// 結果メッシュは indexed (positions の重複を保ったまま indices だけ縮約) になる。
pub fn simplify(mesh: &MeshData, target_triangles: u32) -> MeshData {
    if mesh.is_empty() {
        return mesh.clone();
    }
    if mesh.triangle_count() <= target_triangles {
        return mesh.clone();
    }

    // meshopt は VertexDataAdapter で位置オフセット付きバイト列を受ける。
    // [Vec3; N] (= [f32; 3] * N) として直接 byte slice 化する。
    let position_bytes: &[u8] = bytemuck_cast(&mesh.positions);
    let adapter = VertexDataAdapter::new(
        position_bytes,
        std::mem::size_of::<[f32; 3]>(),
        0,
    )
    .expect("VertexDataAdapter from Vec3 slice");

    let target_index_count = (target_triangles as usize) * 3;

    let new_indices = meshopt::simplify(
        &mesh.indices,
        &adapter,
        target_index_count,
        DEFAULT_TARGET_ERROR,
        SimplifyOptions::None,
        None,
    );

    MeshData {
        name: mesh.name.clone(),
        positions: mesh.positions.clone(),
        indices: new_indices,
    }
}

/// `Vec<glam::Vec3>` → `&[u8]` の安全な再解釈。
///
/// `glam::Vec3` は `repr(C)` で `[f32; 3]` 同等のレイアウトなので
/// `meshopt` (および GPU バッファ) で扱う `[f32; 3]` 列としてそのまま参照できる。
fn bytemuck_cast(positions: &[glam::Vec3]) -> &[u8] {
    let len = std::mem::size_of_val(positions);
    // SAFETY: glam::Vec3 is #[repr(C)] of three f32; reading as bytes is sound.
    unsafe { std::slice::from_raw_parts(positions.as_ptr() as *const u8, len) }
}

#[cfg(test)]
mod tests {
    use super::*;
    use glam::Vec3;

    fn unit_grid_mesh(side: u32) -> MeshData {
        // side x side の四角形格子を 2 三角形/quad で展開
        let mut positions = Vec::new();
        let mut indices = Vec::new();
        let s = side as f32;
        for y in 0..=side {
            for x in 0..=side {
                positions.push(Vec3::new(x as f32 / s, y as f32 / s, 0.0));
            }
        }
        let row = side + 1;
        for y in 0..side {
            for x in 0..side {
                let i0 = y * row + x;
                let i1 = i0 + 1;
                let i2 = i0 + row;
                let i3 = i2 + 1;
                indices.extend_from_slice(&[i0, i1, i2, i1, i3, i2]);
            }
        }
        MeshData {
            name: "grid".into(),
            positions,
            indices,
        }
    }

    #[test]
    fn passthrough_when_under_target() {
        let mesh = unit_grid_mesh(2); // 2*2*2 = 8 tri
        let out = simplify(&mesh, 256);
        assert_eq!(out.triangle_count(), mesh.triangle_count());
    }

    #[test]
    fn reduces_high_tri_mesh_below_target() {
        // 32x32 = 2048 tri、target 256
        let mesh = unit_grid_mesh(32);
        assert!(mesh.triangle_count() > 256);
        let out = simplify(&mesh, 256);
        assert!(
            out.triangle_count() <= 256,
            "got {} tri after simplify",
            out.triangle_count()
        );
    }

    #[test]
    fn deterministic_repeated_calls() {
        let mesh = unit_grid_mesh(16); // 512 tri
        let a = simplify(&mesh, 64);
        let b = simplify(&mesh, 64);
        assert_eq!(a.indices, b.indices);
    }

    #[test]
    fn empty_mesh_passthrough() {
        let mesh = MeshData::default();
        let out = simplify(&mesh, 256);
        assert!(out.is_empty());
    }
}
