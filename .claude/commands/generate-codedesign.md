Arsプロジェクトからコード詳細設計（codedesign）を生成する。

## あなたの役割
あなたはコード詳細設計の生成エージェントです。Arsプロジェクトの定義データを読み込み、
アクター/ドメイン単位でコード詳細設計ファイル（Markdown）を `codedesign/` に出力します。

## 事前に必ず読み込むファイル

以下のルールファイルを **必ず最初に** 読み込んでください：

1. `spec/ars.md` — 実装ルール・設計思想
2. `spec/platforms.md` — 対象プラットフォーム定義（Unity / Godot / UE / Ergo）
3. `spec/rule/project-save-rules.md` — codedesign ファイル構造・命名規則
4. `spec/rule/codedesign-generation-rules.md` — 詳細設計テンプレート・生成ルール

## 入力

`$ARGUMENTS` の形式:

```
<project-file-path> <platform>
```

- `project-file-path`: Arsプロジェクト JSON ファイルのパス（例: `./my-project.ars.json`）
- `platform`: 対象プラットフォーム。以下のいずれか:
  - `unity` — Unity (C#)
  - `godot` — Godot (GDScript)
  - `unreal` — Unreal Engine (C++)
  - `ergo` — Ergo / ars-native (TypeScript)

例: `/generate-codedesign ./demo.ars.json unity`

## 実行手順

### 1. ルール読み込み
上記4ファイルを読み込み、生成ルール・テンプレートを把握する。

### 2. プロジェクト読み込み
指定されたプロジェクト JSON を読み込み、以下を解析する：
- `scenes` — 全シーンとそのアクター構成
- `components` — 全コンポーネント定義（変数・タスク・依存関係）
- `prefabs` — プレハブ定義

### 3. 出力先準備
プロジェクトファイルと同じディレクトリに `codedesign/` を作成する。
既存ファイルがある場合は、変更があったファイルのみ上書きする。

### 4. アクター/ドメイン単位で生成

全シーンに対して以下を実行する：

#### 4a. シーン設計ファイル生成
- `codedesign/{scene-name}/_scene.md` を生成
- シーンの概要、アクター構成、メッセージフロー、アクション一覧を記載

#### 4b. アクター設計ファイル生成
シーン内の全アクターに対して：
- `codedesign/{scene-name}/{actor-name}.md` を生成
- サブシーンを持つアクターは `{actor-name}/_actor.md` にする
- テンプレートに従い以下を **全て** 記載する：
  - メタ情報（ID, タイプ, ロール, プラットフォーム, 言語）
  - 概要 / 達成目標 / 役割 / 挙動（requirements）
  - ステート定義（State型のみ）
  - 表示物（Display + プラットフォーム別レンダリング指示）
  - **コンポジットシステム**（結合されたコンポーネントの一覧と詳細）
  - **メッセージ / インタフェース**（送信・受信の両方向 + アクション定義）
  - **接続データ**（Data Organizer 連携があれば）
  - **UI 連携**（UI 要素があれば）
  - サブシーン参照
  - 依存関係サマリー
  - プラットフォーム別実装ノート

#### 4c. インタフェース定義ファイル生成
`messageType: "interface"` のメッセージを `codedesign/interfaces/` に出力する。

### 5. 生成結果の報告

生成が完了したら以下を報告する：
- 生成したファイル数（シーン / アクター / インタフェース）
- 出力先ディレクトリ
- 注意点やスキップした項目（あれば）

## 重要なルール

1. **全アクター網羅**: 一つも漏らさず全アクターの設計ファイルを生成する
2. **接続情報完全記載**: メッセージ・インタフェース・アクションを送受信両方向で記載する
3. **コンポーネント詳細展開**: コンポーネントはIDの参照だけでなく、変数・タスク・テストケースを全展開する
4. **空セクション保持**: 該当なしの場合も見出しは残し「なし」と記載する
5. **kebab-case 命名**: ファイル名・ディレクトリ名は kebab-case にする
6. **差分生成**: 既存の codedesign/ がある場合、変更のあったファイルのみ更新する

## プラットフォーム別の実装指示

| プラットフォーム | 言語 | モジュール形式 | メッセージ方式 | 命名規則 |
|---------------|------|-------------|-------------|---------|
| Unity | C# | MonoBehaviour / ScriptableObject | UnityEvent / Delegate | `Ars.Ergo.{Domain}` |
| Godot | GDScript | Node / Resource | signal / call_group() | `Ergo{ComponentName}` |
| Unreal | C++ | UActorComponent / UObject | Delegate / Event Dispatcher | `ArsErgo{Domain}` |
| Ergo | TypeScript | TypeScript Module | Port-based Message | `ars-ergo-{domain}` |

## 制約
- テンプレートに書かれた全セクションを出力すること（省略禁止）
- プロジェクトJSONに存在しないデータを捏造しないこと
- 推測が必要な場合は `{TODO: ...}` マーカーを残すこと
