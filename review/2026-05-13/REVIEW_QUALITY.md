# REVIEW_QUALITY — 品質

**評価: B**

- Q1 (C): 命名二重化。 lexicon kebab-case (`spec/game-lexicon/README.md:41`)、 game-template フォルダは snake_case。 `slg`↔`slg_grid` 等で機械 join 不能 (M2 と同根)。
- Q2 (B): README リンクは概ね健全、 Docker セクションのみ死 (`README.md:209`)。
- Q3 (B): `spec/ars.md` 11 行と `game-feature-coverage.md` 244 行で上位ほど薄い逆転構造。
- Q4 (B): `combo-system.toml` の `cancel_window_ms` と lexicon README §3 サンプル `buffer_window_ms` の軽微不一致。 V01-V06 検証が CI 未統合。
- Q5 (A): mkdocs-material 設定 (palette / pymdownx / mermaid) は読みやすい。 将来 nav 明示が必要。
- Q6 (A): MIT `LICENSE` / copyright 2026 LUDIARS 明記。
- Q7 (A): 5 workflow すべて concurrency / timeout / paths-filter / permissions 最小化済。
