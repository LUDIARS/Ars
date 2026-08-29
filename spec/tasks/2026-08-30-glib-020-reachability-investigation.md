---
task: glib-020-reachability-investigation
project: Ars
kind: 調査結果
created: 2026-08-30
---
# glib 0.20.0 への到達経路調査 (結論: 現状では未実施が妥当)

## 調査結果

`cargo tree --invert glib --target all` で到達経路を確認した。

```
glib v0.18.5
├── atk v0.18.2 → gtk v0.18.2 → tauri v2.10.3 (Linux GTK backend, tao/wry 経由)
├── cairo-rs / gdk / gdk-pixbuf / gdkx11 / gio / javascriptcore-rs / ...
└── いずれも gtk-rs 0.18 系列 (GTK3 バインディング) 経由
```

`gtk` crate (0.18.2) は crates.io の説明に **"UNMAINTAINED Rust bindings for the
GTK+ 3 library (use gtk4 instead)"** と明記されている。0.18.2 が事実上の最終版であり、
`gtk` 0.18.2 の依存系列は `glib` 0.18.5 に固定される。`glib` 0.20.0 以上に到達するには、
tauri の Linux バックエンドが `gtk` 0.18 系から、互換性のある GTK4 バインディング等へ
移行する必要がある。

### tauri を最新へ上げても glib は動かない

`cargo update -p tauri --precise 2.11.5 --dry-run` で確認したところ、tauri は
2.10.3 → 2.11.5 に上がり `tao` も 0.34.8 → 0.35.3 に連動するが、**glib / gtk 系列は
一切変化しない**。tauri の Linux バックエンド (`tao`/`wry`/`muda`) が GTK3
(`gtk`/`gdk` 0.18 系) に依存する構造は tauri 2.11.5 時点でも変わっていない。

tauri 本体の GTK4 移行状況は crates.io の版情報だけでは確認できず (upstream の
tauri/tao/wry リポジトリ側の作業計画を追う必要がある)。少なくとも調査時点で確認した
tauri 2.11.5 はまだ GTK3 依存を解消していない。

## 判断: 実施しない (upstream 側の制約待ち)

- **到達経路**: tauri (Linux backend) → tao/wry/muda → gtk-rs 0.18 系 → glib 0.18.5
- **実施しない理由**: `glib` 単体の bump や `cargo update` では届かず、tauri が
  Linux バックエンドを GTK4 (`gtk4` crate) へ移行しない限り 0.20.0 に到達できない。
  これは Ars 側で完結する変更ではなく tauri/tao/wry の upstream 対応待ち。
  無理に `gtk4` へ独自移行するのは tauri がまだ GTK3 前提で組んでいる Linux
  バックエンド実装との非互換を生み、影響範囲が本タスクの想定 (依存 bump) を
  大きく超える。
- **再検討条件**: tauri が GTK4 等の `glib` 0.20.0 以上と互換性のある Linux
  バックエンドを提供したら、そのリリースへの更新タスクとして再評価する。

## 完了条件 (元タスクより)

- [x] esbuild (ars-editor) を 0.28 系へ bump — 別ブランチ (chore/deps-major-residuals-esbuild)
- [x] @hono/node-server (ars-mcp-server) を 2.x へ bump — 別ブランチ (chore/deps-major-residuals-hono-node-server)
- [x] glib 0.20.0 への到達経路を特定し、実施する/しないを判断する — 本ファイル。判断: **実施しない** (tauri upstream の GTK4 移行待ち)
