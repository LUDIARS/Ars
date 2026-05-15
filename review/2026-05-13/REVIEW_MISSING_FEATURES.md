# REVIEW_MISSING_FEATURES — 欠落

**評価: B** — `spec/game-feature-coverage.md` §C-E で欠落を網羅的に自己把握済。 未認知ではなく未着手。

- M1 (C): lexicon 未定義 Feature ID 約 160。 優先度高: action 5 (`lockon` `parry-system` `posture-stagger` `enemy-ai-states` `stamina-system`)、 rhythm 11 (`song-database` `chart-loader` `audio-engine` 等)。
- M2 (B): lexicon `genres/` 9 vs template 17。 `slg`↔`slg_grid` / `open-world`↔`open_world` / `story-jrpg`↔`jrpg` の命名乖離で機械 join 不可。
- M3 (B): 14 ジャンルが `code/codedesign/gamedesign/test/ubi/` 未提供 (I3)。
- M4 (B): README ドキュメント表 (`README.md:244-251`) に `spec/game-lexicon/` `spec/game-template/` `spec/game-feature-coverage.md` `spec/ergo/INDEX.md` のリンクなし。
- M5 (C): `docker-compose.yaml` 不在 (`README.md:206-213` 全体無効)。
- M6 (B): `spec/ars.md` 11 行・名称がリポ名と被り曖昧 → `implementation-rules.md` 改名候補。
- M7 (B): 外向き `CLAUDE.md` なし。 `.claude/skills/dev-rules.md` 等の内部 hint のみ。
