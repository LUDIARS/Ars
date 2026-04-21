//! 最小 GLB (glTF 2.0 binary) writer (P2)
//!
//! プロキシメッシュ (positions + 32-bit indices のみ) を表現する最小限の
//! GLB ファイルをバイト列で生成する。ノード変換 / マテリアル / 法線 / UV
//! 等は持たない。
//!
//! 決定性: JSON は固定順のキーで手書き、padding 文字も glTF 仕様準拠
//! (JSON chunk は 0x20、BIN chunk は 0x00) で固定する。同一入力に対し
//! 常に同一バイト列を返す。
//!
//! ## ファイルレイアウト (glTF 2.0 spec)
//!
//! ```text
//! [12B header] [JSON chunk] [BIN chunk]
//!
//! header: magic "glTF" (4B) + version=2 (4B) + total length (4B)
//! chunk:  length (4B) + type (4B "JSON" or "BIN\0") + data + padding to 4B align
//! ```

use std::io::Write;
use std::path::Path;

use byteorder::{LittleEndian, WriteBytesExt};

use crate::loaders::MeshData;
use crate::{AssetImporterError, Result};

const GLB_MAGIC: u32 = 0x4654_6C67; // "glTF"
const GLB_VERSION: u32 = 2;
const CHUNK_TYPE_JSON: u32 = 0x4E4F_534A; // "JSON"
const CHUNK_TYPE_BIN: u32 = 0x004E_4942; // "BIN\0"

const COMPONENT_TYPE_FLOAT: u32 = 5126;
const COMPONENT_TYPE_UNSIGNED_INT: u32 = 5125;
const TARGET_ARRAY_BUFFER: u32 = 34962;
const TARGET_ELEMENT_ARRAY_BUFFER: u32 = 34963;
const MODE_TRIANGLES: u32 = 4;

/// `mesh` を GLB 形式のバイト列にエンコードする。
///
/// `mesh.positions` が空の場合はエラーを返す。`mesh.indices` が空の場合は
/// non-indexed として連番インデックスを生成する。
pub fn encode_glb(mesh: &MeshData) -> Result<Vec<u8>> {
    if mesh.positions.is_empty() {
        return Err(AssetImporterError::EmptyGeometry);
    }

    // ---- BIN chunk (positions then indices) を組み立て ----
    let pos_count = mesh.positions.len();
    let pos_bytes = pos_count * std::mem::size_of::<[f32; 3]>();

    let indices_owned: Vec<u32>;
    let indices: &[u32] = if mesh.indices.is_empty() {
        indices_owned = (0..pos_count as u32).collect();
        &indices_owned
    } else {
        &mesh.indices
    };
    let idx_count = indices.len();
    let idx_bytes = std::mem::size_of_val(indices);

    let mut bin: Vec<u8> = Vec::with_capacity(pos_bytes + idx_bytes);
    for v in &mesh.positions {
        bin.write_f32::<LittleEndian>(v.x).unwrap();
        bin.write_f32::<LittleEndian>(v.y).unwrap();
        bin.write_f32::<LittleEndian>(v.z).unwrap();
    }
    let pos_byte_offset = 0usize;
    let idx_byte_offset = bin.len();
    for &i in indices {
        bin.write_u32::<LittleEndian>(i).unwrap();
    }
    pad_to_4(&mut bin, 0x00);
    let bin_chunk_len = bin.len();

    // ---- AABB (POSITION accessor の min/max) ----
    let (mn, mx) = aabb_min_max(&mesh.positions);

    // ---- JSON chunk を手書きで決定的に組み立て ----
    let json = build_json(
        bin_chunk_len,
        pos_byte_offset,
        pos_bytes,
        idx_byte_offset,
        idx_bytes,
        pos_count,
        idx_count,
        mn,
        mx,
    );
    let mut json_bytes = json.into_bytes();
    pad_to_4(&mut json_bytes, 0x20);
    let json_chunk_len = json_bytes.len();

    // ---- 全体組み立て ----
    let total_len = 12 + 8 + json_chunk_len + 8 + bin_chunk_len;
    let mut out = Vec::with_capacity(total_len);

    // header
    out.write_u32::<LittleEndian>(GLB_MAGIC).unwrap();
    out.write_u32::<LittleEndian>(GLB_VERSION).unwrap();
    out.write_u32::<LittleEndian>(total_len as u32).unwrap();

    // JSON chunk
    out.write_u32::<LittleEndian>(json_chunk_len as u32).unwrap();
    out.write_u32::<LittleEndian>(CHUNK_TYPE_JSON).unwrap();
    out.extend_from_slice(&json_bytes);

    // BIN chunk
    out.write_u32::<LittleEndian>(bin_chunk_len as u32).unwrap();
    out.write_u32::<LittleEndian>(CHUNK_TYPE_BIN).unwrap();
    out.extend_from_slice(&bin);

    debug_assert_eq!(out.len(), total_len);
    Ok(out)
}

/// `encode_glb` の結果を `path` に書き出す。
pub fn write_glb(mesh: &MeshData, path: &Path) -> Result<()> {
    let bytes = encode_glb(mesh)?;
    let mut f = std::fs::File::create(path).map_err(|e| AssetImporterError::io(path, e))?;
    f.write_all(&bytes)
        .map_err(|e| AssetImporterError::io(path, e))?;
    Ok(())
}

fn pad_to_4(buf: &mut Vec<u8>, fill: u8) {
    let rem = buf.len() % 4;
    if rem != 0 {
        buf.resize(buf.len() + (4 - rem), fill);
    }
}

fn aabb_min_max(positions: &[glam::Vec3]) -> ([f32; 3], [f32; 3]) {
    let mut mn = positions[0];
    let mut mx = positions[0];
    for &p in &positions[1..] {
        mn = mn.min(p);
        mx = mx.max(p);
    }
    (mn.to_array(), mx.to_array())
}

/// JSON を決定的な順序で手書き構築する。
///
/// `serde_json` を経由しない理由: BTreeMap によるキーソートでは accessors/
/// bufferViews 内の順序まで完全には制御できないため、バイト一致テストの
/// 安全性を最大化するために手書きで固定する。
#[allow(clippy::too_many_arguments)]
fn build_json(
    bin_chunk_len: usize,
    pos_byte_offset: usize,
    pos_bytes: usize,
    idx_byte_offset: usize,
    idx_bytes: usize,
    pos_count: usize,
    idx_count: usize,
    mn: [f32; 3],
    mx: [f32; 3],
) -> String {
    format!(
        concat!(
            r#"{{"asset":{{"version":"2.0","generator":"ars-asset-importer"}},"#,
            r#""buffers":[{{"byteLength":{bin_len}}}],"#,
            r#""bufferViews":["#,
            r#"{{"buffer":0,"byteOffset":{pos_off},"byteLength":{pos_len},"target":{pos_target}}},"#,
            r#"{{"buffer":0,"byteOffset":{idx_off},"byteLength":{idx_len},"target":{idx_target}}}"#,
            r#"],"#,
            r#""accessors":["#,
            r#"{{"bufferView":0,"componentType":{ct_f32},"count":{vc},"type":"VEC3","min":[{mnx},{mny},{mnz}],"max":[{mxx},{mxy},{mxz}]}},"#,
            r#"{{"bufferView":1,"componentType":{ct_u32},"count":{ic},"type":"SCALAR"}}"#,
            r#"],"#,
            r#""meshes":[{{"primitives":[{{"attributes":{{"POSITION":0}},"indices":1,"mode":{mode}}}]}}],"#,
            r#""nodes":[{{"mesh":0}}],"#,
            r#""scenes":[{{"nodes":[0]}}],"#,
            r#""scene":0}}"#,
        ),
        bin_len = bin_chunk_len,
        pos_off = pos_byte_offset,
        pos_len = pos_bytes,
        pos_target = TARGET_ARRAY_BUFFER,
        idx_off = idx_byte_offset,
        idx_len = idx_bytes,
        idx_target = TARGET_ELEMENT_ARRAY_BUFFER,
        ct_f32 = COMPONENT_TYPE_FLOAT,
        vc = pos_count,
        mnx = format_float(mn[0]),
        mny = format_float(mn[1]),
        mnz = format_float(mn[2]),
        mxx = format_float(mx[0]),
        mxy = format_float(mx[1]),
        mxz = format_float(mx[2]),
        ct_u32 = COMPONENT_TYPE_UNSIGNED_INT,
        ic = idx_count,
        mode = MODE_TRIANGLES,
    )
}

/// 浮動小数点を決定的に整形する。
///
/// Rust の `Display for f32` (Grisu/Ryu) は同じ値に対し常に同じ表現を返すので、
/// プラットフォーム差は出ない。NaN/Inf は仕様外なので 0 として扱う。
fn format_float(v: f32) -> String {
    if v.is_finite() {
        format!("{v}")
    } else {
        "0".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use glam::Vec3;

    fn triangle_mesh() -> MeshData {
        MeshData {
            name: "tri".into(),
            positions: vec![
                Vec3::new(0.0, 0.0, 0.0),
                Vec3::new(1.0, 0.0, 0.0),
                Vec3::new(0.0, 1.0, 0.0),
            ],
            indices: vec![0, 1, 2],
        }
    }

    #[test]
    fn header_is_correct() {
        let bytes = encode_glb(&triangle_mesh()).unwrap();
        // magic
        assert_eq!(&bytes[0..4], b"glTF");
        // version
        assert_eq!(u32::from_le_bytes(bytes[4..8].try_into().unwrap()), 2);
        // length matches
        let len = u32::from_le_bytes(bytes[8..12].try_into().unwrap()) as usize;
        assert_eq!(len, bytes.len());
    }

    #[test]
    fn deterministic_byte_for_byte() {
        let m = triangle_mesh();
        let a = encode_glb(&m).unwrap();
        let b = encode_glb(&m).unwrap();
        assert_eq!(a, b);
    }

    #[test]
    fn round_trip_via_gltf_crate() {
        // 出力が gltf クレートで再ロード可能であることを確認
        let bytes = encode_glb(&triangle_mesh()).unwrap();
        let g = gltf::Gltf::from_slice(&bytes).expect("valid GLB");
        let mesh = g.document.meshes().next().expect("has mesh");
        let prim = mesh.primitives().next().expect("has primitive");
        assert_eq!(prim.mode(), gltf::mesh::Mode::Triangles);
    }

    #[test]
    fn empty_mesh_errors() {
        let m = MeshData::default();
        assert!(encode_glb(&m).is_err());
    }
}
