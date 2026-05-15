# Ars 自動コードレビュー (2026-05-13)

リポジトリ: `LUDIARS/Ars` (ローカル: `E:/Document/Ars/ars`)
スコープ: README / DESIGN / CLAUDE / spec/* / .github/* (game-lexicon + game-template + Ergo 参照 + Pages 公開構成)
レビュー対象は **ドキュメント / 仕様データ / CI 設定** のみ。 ソースコード本体 (crates/, ars-editor/) は範囲外。

## 総合評価

| 観点 | 評価 | 一言 |
|------|------|------|
| 設計整合 (DESIGN) | B | 4 フォルダ vs 7 サブフォルダ等の二重ルールが README と spec で揺れる |
| 脆弱性 (VULNERABILITY) | B | Pages ビルドの permissions は最小化済。 workflow_dispatch のサニタイズ済 (085ab68)。 範囲外領域に致命なし |
| 実装整合 (IMPLEMENTATION) | C | game-template が参照する Feature ID の約 160 件が lexicon 未定義 (本人申告ベース) |
| 機能網羅 (MISSING) | B | 17 ジャンルのうち full 構成は 3 (action / jrpg / rhythm)。 残 14 は feature + ux のみ |
| 品質 (QUALITY) | B | 命名規約が `kebab-case` (lexicon) と `snake_case` (game-template) で混在。 README 内リンク 1 件壊れ可能性 |

**Weighted Score (S5/A4/B3/C2/D1, 5 観点平均):** (3+3+2+3+3)/5 = **2.8 / 5.0**

## 主要所見 (Top 3)

1. **game-template と game-lexicon の ID 整合性**: `spec/game-feature-coverage.md:11` で「参照される ID 総数 約 200 / lexicon 未定義 約 160」と自認。 各テンプレ `INDEX.md` の `[lockon]` `[parry-system]` などはリンク先のないダングリング参照で、 wizard / loader 連携時に `V02` (id 不在) で全停止する。 lexicon V02 検証は loader 側に実装済とされるが、 spec 自体が V02 違反を最初から内包。
2. **README のリンク先と実体の乖離**: `README.md:209` で `docker-compose up -d` を案内しているが、 リポジトリ直下に `docker-compose.yaml` / `compose.yaml` が**存在しない**。 `Dockerfile` のみ。 公開直前の Docker セクションは要更新または削除。
3. **17 ジャンルの密度のばらつき**: `spec/game-template/` 17 フォルダのうち full 7 サブ (`code` `codedesign` `gamedesign` `test` `ubi` `ux` `feature`) を持つのは `action` / `jrpg` / `rhythm` の 3 件。 残 14 は `feature` + `ux` のみで、 README の「各ジャンル直下に INDEX.md (概要) を置き、 必要に応じて以下のサブフォルダで詳細を記述」 (`spec/game-template/README.md:4`) を満たしてはいるが、 ラフな実装ガイドという当初コミット (#107) 段階で止まっている。

## 出力ファイル

| ファイル | 内容 |
|---------|------|
| `REVIEW.md` (本ファイル) | 総括 |
| `REVIEW_DESIGN.md` | 設計 (README / spec の構造) |
| `REVIEW_VULNERABILITY.md` | セキュリティ (CI / workflow / 公開動線) |
| `REVIEW_IMPLEMENTATION.md` | 仕様駆動の整合性 (lexicon × template × ergo) |
| `REVIEW_MISSING_FEATURES.md` | 欠落仕様・欠落データ |
| `REVIEW_QUALITY.md` | 命名・リンク・記述ばらつき |
| `AUTOFIX.md` | 自動修正候補 (列挙のみ、 実行禁止) |
| `latest.json` | サマリ JSON |
