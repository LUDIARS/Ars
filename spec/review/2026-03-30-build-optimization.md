# ビルド最適化: SurrealDB 組み込み排除 (2026-03-30)

## 対応概要

SurrealDB の組み込みドライバー（`kv-rocksdb` feature）を排除し、HTTP クライアント経由の外部接続方式に切り替えた。
RocksDB の C++ コンパイルがビルド時間の大半を占めていたため、これを除去することでビルド時間を大幅に短縮。

**ブランチ**: `claude/optimize-build-performance-lngMM`

---

## 調査結果

### ビルドボトルネック (クリーンビルド: web-server feature)

| 順位 | クレート | 時間 | 備考 |
|------|---------|------|------|
| 1 | surrealdb-librocksdb-sys | **338.9s** | RocksDB C++ フルコンパイル |
| 2 | surrealdb-core | 71.1s | SurrealDB 本体 |
| 3 | aws-sdk-ssm | 59.3s | AWS SDK コード生成 |
| 4 | aws-lc-sys | 49.5s | AWS 暗号ライブラリ (C) |
| 5 | libgit2-sys | 32.4s | Git C ライブラリ |
| 6 | app (自クレート) | 22.5s | |
| 7 | cedar-policy-core | 12.9s | SurrealDB 依存 |
| 8 | lz4-sys | 12.0s | SurrealDB 依存 |
| 9 | zstd-sys | 11.6s | SurrealDB 依存 |
| 10 | surrealdb | 11.2s | SurrealDB ラッパー |

SurrealDB + RocksDB 関連で全体の **約86%** を占めていた。

### GraphDB 利用状況の評価

SurrealDB のグラフ機能は `owns_project` リレーション（`user -[owns_project]-> cloud_project`）のみ。
`RELATE` + `type::thing()` によるグラフ走査だが、実質的には RDB の外部キー JOIN と等価。
複数ホップ走査やパターンマッチングなどグラフ DB 固有の機能は未使用。

元々は AST 解析情報のグラフ格納を想定した設計だったが、現状では PostgreSQL 等で十分対応可能。

---

## 実施内容

### 1. surrealdb_client.rs — HTTP クライアントへの書き換え

- `surrealdb` クレート（組み込みドライバー）を完全除去
- `reqwest` による HTTP REST クライアントに置換（`POST /sql` エンドポイント）
- SurrealQL クエリはそのまま維持（`type::thing()` でレコード ID を明示化）
- レスポンスの JSON パースとレコード ID 変換（`table:id` → `id`）を実装

### 2. auth.rs / editor.rs — リポジトリトレイト経由に変更

- `state.surreal.get_user()` → `state.user_repo.get()` に統一
- `state.surreal.save_project()` → `state.project_repo.save()` に統一
- DB バックエンド実装への直接依存を排除し、将来の差し替えを容易化

### 3. app_state.rs — SurrealClient 非公開化

- `pub surreal: SurrealClient` フィールドを除去
- `SurrealClient` は `SurrealProjectRepository` / `SurrealUserRepository` 内部の実装詳細に
- 接続設定: `SURREALDB_DATA_DIR` → `SURREALDB_URL` / `SURREALDB_USER` / `SURREALDB_PASS`

### 4. Cargo.toml — surrealdb クレート依存の除去

- `surrealdb = { version = "2", features = ["kv-rocksdb"] }` を削除
- web-server feature から `"dep:surrealdb"` を除去

### 5. docker-compose — SurrealDB サービス追加

- `docker-compose.yaml` / `docker-compose.dev.yaml` に `surrealdb/surrealdb:v2` サービス追加
- ars サービスの `depends_on` に `surrealdb` を追加
- `.env.example` に `SURREALDB_PORT`, `SURREALDB_USER`, `SURREALDB_PASS` を追加

---

## 効果

| 指標 | Before | After | 改善 |
|------|--------|-------|------|
| クリーンビルド時間 | 8m 43s | 2m 24s | **-72%** |
| 依存クレート数 | 847 | 655 | **-192** |
| target ディレクトリ | 11 GB | 3.3 GB | **-70%** |
| インクリメンタルビルド | 13-17s | (変化なし) | — |

---

## 今後の計画

1. **ArsServer リポジトリ新設**: プロジェクト管理・認証を別リポジトリ（PostgreSQL ベース）に移行
2. **SurrealDB 完全撤去**: ArsServer 移行完了後、本リポジトリから SurrealDB 関連コード・docker-compose サービスを削除
3. **AWS SDK 軽量化**: `ars-secrets` の AWS 依存を feature gate 化し、不要時のビルドコスト排除（残り約100s 分）
