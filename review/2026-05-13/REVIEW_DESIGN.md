# REVIEW_DESIGN — 設計

**評価: B**

- D1 (B): README の生成プロジェクト 4 フォルダ (`README.md:30-39`) と `spec/game-template/README.md:7-15` の 7 サブフォルダが `codedesign` `gamedesign` `test` で同名重複。 別物だが説明なし。
- D2 (B): `spec/ars.md:1-12` の「モジュール結合でアクター」 と `spec/game-template/action/INDEX.md:65-91` の「フィールド保有 struct」 のマッピング未提示。
- D3 (A): lexicon と template の役割分担は `spec/game-template/README.md:53-64` で明示、 coverage マトリクスも秀逸。
- D4 (B): `mkdocs.yml:10` `docs_dir: spec` 公開、 `pages.yml` 最小権限。 pip cache 切り (43ce089) でビルド毎ネット取得。
- D5 (C): `README.md:103-109` の `src-tauri/src/` 構成図が古い (実体には `web_modules/` `commands/` `git_module_ops.rs` `web_main.rs` 等が未記載)。
