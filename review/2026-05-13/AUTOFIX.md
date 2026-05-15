# AUTOFIX — 自動修正候補 (列挙のみ・実行禁止)

本ファイルは「機械的に直せる」 と判定した修正候補の **列挙のみ**。 今回は **autofix_count=0** (自動実行しない)。 別 PR / 別セッションで処理する想定。

## A. lint / typo

(該当なし — Markdown / TOML の typo 走査は未実施。 次回 textlint + taplo を CI に組み込む際に検出)

## B. リンク健全性

| # | 対象 | 内容 | 推奨アクション |
|---|------|------|--------------|
| B1 | `README.md:209` `docker compose up -d` | `docker-compose.yaml` 不在 | `compose.yaml` を新規作成 or Docker セクションを削除 |
| B2 | `README.md:103-109` `src-tauri/src/` 構成図 | `web_modules/` `commands/` `git_module_ops.rs` `web_main.rs` 未記載 | README 構成図に追記 (差分のみ) |

## C. 命名一致

| # | 対象 | 内容 | 推奨アクション |
|---|------|------|--------------|
| C1 | `spec/game-template/slg_grid/` / `open_world/` / `jrpg/` 等 (snake_case) | lexicon `genres/<id>.toml` は kebab-case (`slg` `open-world` `story-jrpg`) | 全 17 ジャンルを kebab-case に揃える (リネーム + リンク追従) **または** `spec/genre-aliases.toml` で双方向 alias |
| C2 | `spec/game-lexicon/README.md:97` のサンプル `buffer_window_ms` | 実体は `cancel_window_ms` | README サンプルを実体に合わせる |
| C3 | `spec/ars.md` (11 行で名称が曖昧) | リポ名と被る | `spec/implementation-rules.md` にリネーム |

## D. 仕様データ補完 (機械的に作れない、 人手必要)

| # | 対象 | 内容 |
|---|------|------|
| D1 | lexicon `features/action/` に `lockon` `parry-system` `posture-stagger` `enemy-ai-states` `stamina-system` を追加 | game-template/action/INDEX.md の必須 ID を満たす |
| D2 | lexicon `genres/` に 8 ジャンル追加 (`platformer` `vampire_survivors_like` `slg_grid` `strategy_4x` `puzzle_casual` `roguelike_berlin` `deckbuilder_roguelike` `metroidvania` `hack_and_slash` `fps`) または game-template フォルダ名を既存 lexicon と揃える | M2 解消 |
| D3 | 14 ジャンルの `code/` `codedesign/` `gamedesign/` `test/` `ubi/` を seed 作成 (action / jrpg / rhythm を雛形に) | M3 解消 |

## E. CI 強化

| # | 対象 | 内容 |
|---|------|------|
| E1 | `.github/workflows/ci.yml` paths-filter に `spec` を追加し、 `cargo test -p ars-game-lexicon` を起動する job を新設 | I5 (V01-V06 を CI で強制) |
| E2 | `.github/workflows/pages.yml` の MkDocs install を `pip install -r requirements.txt` + cache key 化 | D4 (Pages build の速度・再現性) |

## F. README ナビゲーション

| # | 対象 | 内容 |
|---|------|------|
| F1 | `README.md:244-251` ドキュメント表に `spec/game-lexicon/README.md` / `spec/game-template/README.md` / `spec/game-feature-coverage.md` / `spec/ergo/INDEX.md` 4 行追加 | M4 解消 |

## G. セキュリティ・ハードニング

| # | 対象 | 内容 |
|---|------|------|
| G1 | `mkdocs.yml` の `pymdownx.snippets` に `base_path: [spec]` を明示 | V4 (公開対象を spec/ 配下に固定) |

---

## autofix_count

```
autofix_count = 0
```

理由: 本セッションは review (列挙) のみ。 実行は別タスクに委ねる。
