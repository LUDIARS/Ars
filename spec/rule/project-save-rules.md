# プロジェクト保存ルール

Ars プロジェクトの保存形式・キャッシュ戦略・要件定義ファイルの管理ルール。

## 要件定義ファイル

Ars で作成したアクターは、それぞれ個別の **要件定義ファイル（Markdown）** として保存する。

### 階層構造

シーン／アクターの親子関係をディレクトリ階層で表現する。

```
{project-root}/
└── requirements/
    ├── interfaces/                     # インタフェース定義（別途集約）
    │   ├── {interface-name}.md
    │   └── ...
    ├── {scene-name}/                   # シーン単位のディレクトリ
    │   ├── _scene.md                   # シーン自体の要件定義
    │   ├── {actor-name}.md             # シーン直下のアクター要件定義
    │   └── {actor-name}/              # サブシーンを持つアクター
    │       ├── _actor.md               # 親アクター自体の要件定義
    │       ├── {child-actor}.md        # 子アクターの要件定義
    │       └── ...
    └── ...
```

### 命名規則

| 対象 | ファイル名 | 備考 |
|------|-----------|------|
| シーン | `{scene-name}/_scene.md` | シーンディレクトリ直下に配置 |
| アクター（リーフ） | `{actor-name}.md` | 子を持たないアクター |
| アクター（親） | `{actor-name}/_actor.md` | サブシーンを持つアクター |
| インタフェース | `interfaces/{interface-name}.md` | 全インタフェースを集約 |

### 要件定義ファイルの内容

各要件定義ファイルには以下を含める。

```markdown
# {アクター名}

## メタ情報
- **ID**: {actor-id}
- **タイプ**: simple | state | flexible
- **ドメインロール**: {role}

## 概要
{requirements.overview}

## 達成目標
{requirements.goals}

## 役割
{requirements.role}

## 挙動
{requirements.behavior}

## ステート定義（State型のみ）
- {state-name}: {processes}

## 表示物（Display）
- {display-name}: {satisfies} → {pipeline_config}

## 依存関係
- 使用コンポーネント: [...]
- メッセージ送信先: [...]
- メッセージ受信元: [...]
```

### コード生成との関係

- **要件定義ファイルをコード生成の入力とする**
- `ars-codegen` は要件定義 Markdown を読み取り、プラットフォーム別のコードを生成する
- 要件定義の変更はコード再生成のトリガーとなる

## インタフェース定義

アクター間のインタフェース（メッセージ定義）は `requirements/interfaces/` に別途まとめる。

```markdown
# {インタフェース名}

## メタ情報
- **ID**: {message-id}
- **送信元**: {source-actor-name} ({source-domain-id})
- **送信先**: {target-actor-name} ({target-domain-id})

## 説明
{description}

## データ形式
- 入力: {input-schema}
- 出力: {output-schema}
```

## 依存関係グラフ

各要件定義ファイルのつながりを **グラフ** で表現し、可視化可能にする。

### グラフの構成要素

| 要素 | 説明 |
|------|------|
| ノード | 各アクター（要件定義ファイル） |
| エッジ（メッセージ） | アクター間のメッセージ送受信 |
| エッジ（親子） | サブシーンによる階層関係 |
| エッジ（コンポーネント共有） | 同一コンポーネントを使用するアクター間の関係 |

### グラフデータ形式

グラフはキャッシュファイル内に JSON 形式で保持する（後述）。

```json
{
  "nodes": [
    {
      "id": "actor-id",
      "name": "ActorName",
      "scene_id": "scene-id",
      "actor_type": "simple",
      "file_path": "requirements/scene-name/actor-name.md"
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "actor-id-1",
      "target": "actor-id-2",
      "edge_type": "message",
      "label": "MessageName"
    }
  ]
}
```

## キャッシュファイル

要件定義とグラフ関連図を定期的に更新し、JSON 形式のキャッシュファイルとして保存する。

### キャッシュファイルの配置

```
{project-root}/
└── .ars-cache/
    ├── project-graph.json          # プロジェクト全体の依存関係グラフ
    ├── scenes/
    │   └── {scene-id}.json         # シーン単位のキャッシュ（アクター一覧・関係）
    └── requirements-index.json     # 要件定義ファイルのインデックス
```

### キャッシュファイルの内容

#### `project-graph.json`

プロジェクト全体のアクター依存関係グラフ。

```json
{
  "version": 1,
  "updated_at": "2026-04-09T12:00:00Z",
  "nodes": [ ... ],
  "edges": [ ... ]
}
```

#### `scenes/{scene-id}.json`

シーン単位のアクター情報・レイアウト・メッセージ定義を含むキャッシュ。

```json
{
  "version": 1,
  "updated_at": "2026-04-09T12:00:00Z",
  "scene_id": "scene-id",
  "scene_name": "SceneName",
  "actors": [ ... ],
  "messages": [ ... ],
  "sub_graphs": [ ... ]
}
```

#### `requirements-index.json`

要件定義ファイルのパス・メタ情報を一覧化したインデックス。

```json
{
  "version": 1,
  "updated_at": "2026-04-09T12:00:00Z",
  "entries": [
    {
      "actor_id": "actor-id",
      "actor_name": "ActorName",
      "scene_id": "scene-id",
      "file_path": "requirements/scene-name/actor-name.md",
      "last_modified": "2026-04-09T12:00:00Z"
    }
  ]
}
```

### キャッシュの更新タイミング

| タイミング | 処理 |
|-----------|------|
| プロジェクト保存時 | 全キャッシュを再生成 |
| シーン編集完了時 | 該当シーンのキャッシュとグラフを差分更新 |
| アクター追加・削除・変更時 | 該当アクターの要件定義ファイルとインデックスを更新 |
| 定期（バックグラウンド） | 要件定義ファイルとキャッシュの整合性チェック・修復 |

### キャッシュの読み込み

| イベント | 処理 |
|---------|------|
| プロジェクトを開いた時 | `project-graph.json` + `requirements-index.json` を読み込み、プロジェクト全体の構造を復元 |
| シーンを開いた時 | `scenes/{scene-id}.json` を読み込み、ノードエディタの画面を構築 |
| キャッシュが存在しない場合 | `project.json` と `requirements/` から再構築 |

## 運用ルール

1. **要件定義ファイルを正（Source of Truth）とする** — キャッシュは再生成可能な派生データ
2. **キャッシュファイルは `.gitignore` に含めてよい** — 再生成可能なため
3. **要件定義ファイルは Git 管理対象とする** — プロジェクトの設計ドキュメントとして履歴を残す
4. **要件定義ファイルの手動編集を許容する** — エディタ外での修正も有効。次回読み込み時にキャッシュを再構築
5. **インタフェース定義とアクター要件定義の整合性を保つ** — メッセージ定義の追加・変更時は双方を更新する
