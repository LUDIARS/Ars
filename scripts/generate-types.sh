#!/bin/bash
# Rust (ars-core) の型定義から TypeScript 型を自動生成するスクリプト
# 使い方: ./scripts/generate-types.sh

set -euo pipefail
cd "$(dirname "$0")/.."

echo "Generating TypeScript types from ars-core..."

# ts-rs のテストを実行して bindings を生成
cargo test -p ars-core export 2>/dev/null

# 生成先ディレクトリをクリーンアップ
DEST="ars-editor/src/types/generated"
rm -rf "$DEST"
mkdir -p "$DEST"

# コピー
cp crates/ars-core/bindings/*.ts "$DEST/"
if [ -d "crates/ars-core/bindings/serde_json" ]; then
  cp -r crates/ars-core/bindings/serde_json "$DEST/"
fi

# index.ts を生成
{
  echo "// Auto-generated from ars-core Rust types. Do not edit."
  echo "// Run ./scripts/generate-types.sh to regenerate."
  echo ""
  for f in "$DEST"/*.ts; do
    name=$(basename "$f" .ts)
    if [ "$name" != "index" ]; then
      echo "export type { $name } from './$name';"
    fi
  done
} > "$DEST/index.ts"

echo "Generated $(ls "$DEST"/*.ts | wc -l) type files in $DEST/"
