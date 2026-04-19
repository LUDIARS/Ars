//! glTF 2.0 / GLB ローダー。
//!
//! 原アセット内の全メッシュを単一 `MeshData` に統合する。
//! ノード変換は適用しない (Tier 1 は「そのモデルの局所形状」を保持する目的)。

use std::path::Path;

use glam::Vec3;

use super::MeshData;
use crate::{AssetImporterError, Result};

pub fn load(path: &Path) -> Result<MeshData> {
    let (doc, buffers, _images) = gltf::import(path)?;

    let mut out = MeshData {
        name: path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("asset")
            .to_string(),
        ..Default::default()
    };

    for mesh in doc.meshes() {
        for primitive in mesh.primitives() {
            if primitive.mode() != gltf::mesh::Mode::Triangles {
                continue;
            }

            let reader = primitive.reader(|b| buffers.get(b.index()).map(|d| &d.0[..]));

            let base_vertex = out.positions.len() as u32;

            if let Some(iter) = reader.read_positions() {
                for p in iter {
                    out.positions.push(Vec3::from_array(p));
                }
            } else {
                continue;
            }

            if let Some(iter) = reader.read_indices() {
                for i in iter.into_u32() {
                    out.indices.push(base_vertex + i);
                }
            } else {
                let added = out.positions.len() as u32 - base_vertex;
                for i in 0..added {
                    out.indices.push(base_vertex + i);
                }
            }
        }
    }

    if out.is_empty() {
        return Err(AssetImporterError::EmptyGeometry);
    }

    Ok(out)
}
