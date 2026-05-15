# REVIEW_IMPLEMENTATION — 実装整合

**評価: C** — 「単一の真実」 を謳う lexicon が、 game-template から約 160 ID 分のダングリング参照を受ける。 自己申告 (`spec/game-feature-coverage.md:11`) で把握済だが放置。

- I1 (C): lexicon V02 (参照 ID 存在) を spec 自身が破る。 `spec/game-template/action/INDEX.md:29-34` の `[lockon]` `[parry-system]` `[posture-stagger]` `[enemy-ai-states]` `[stamina-system]` は `spec/game-lexicon/features/action/` に不在 (4 件のみ存在)。 将来 wizard / loader が V02 で停止。
- I2 (B): lexicon 43 件 = 実測 ✅。 Ergo 直接 4 / 部分 6 も §A 表と整合。
- I3 (C): 17 ジャンル中 full 7 サブ持ちは 3 (`action` / `jrpg` / `rhythm`)、 14 は `feature` + `ux` のみ。 「仕様駆動」 看板に対し 82% が概要止まり。
- I4 (C): `README.md:209` `docker compose up -d` 案内に対し `docker-compose.yaml` 不在。 `src-tauri/src/` 構成図も古い。
- I5 (B): `ci.yml:31-37` paths-filter は `ars-editor/**` `crates/**` のみ。 `spec/**` のみの PR は CI 不走行で V01-V06 検証も非自動。
