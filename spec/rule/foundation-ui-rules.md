# Foundation UI ルール

## 概要

Foundation は LUDIARS 全 Web フロントエンド (Ars, Schedula, Cernere) で共有する UI デザインシステムである。

## デザイントークン

CSS Custom Properties を全プロジェクトで統一する。

```css
:root {
  --bg: #0d1117;
  --bg-surface: #161b22;
  --bg-surface-2: #21262d;
  --border: #30363d;
  --text: #e6edf3;
  --text-muted: #8b949e;
  --accent: #58a6ff;
  --accent-hover: #79c0ff;
  --green: #3fb950;
  --orange: #d29922;
  --red: #f85149;
  --purple: #bc8cff;
  --pink: #f778ba;
  --radius: 8px;
  --radius-sm: 4px;
}
```

## スタイリング

- Tailwind CSS 4 (`@tailwindcss/vite`) + CSS 変数
- ダークテーマ基本
- コンポーネント内は Tailwind ユーティリティまたは `style={{ ... }}` + CSS 変数

## モバイル対応 (スマホ縦画面)

全 Web サービスはスマホ縦画面に対応する。

### ブレークポイント

| 幅 | 区分 |
|----|------|
| `<= 767px` | モバイル (スマホ縦画面) |
| `768px - 1024px` | タブレット |
| `>= 768px` | デスクトップ |

### モバイル UI 原則

1. **タッチ操作前提**: ボタン・タップターゲットは最低 44px
2. **サイドバー → ドロワー**: デスクトップのサイドバーはモバイルではスライドインドロワーに変換
3. **ボトムシート**: 詳細情報やエディタはボトムシートで表示
4. **FAB (Floating Action Button)**: 主要アクション用。右下配置、56px
5. **スクロール / スワイプ**: パネル切り替えはスクロールまたはスワイプ
6. **React Flow キャンバス**: ピンチズーム・パンで操作。ノードは最小幅を維持

### Ars Editor 固有

- ツールバーはモバイルでハンバーガーメニューに折り畳み
- Scene リストはドロワー (左からスライドイン)
- ComponentEditor / Preview はボトムシート (下からスライドアップ)
- ノードの Actions ボタンはタップ可能なサイズ (最低 32px)
