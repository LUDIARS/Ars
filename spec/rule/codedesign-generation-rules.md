# codedesign 生成ルール

Ars プロジェクトのアクター定義からコード詳細設計（codedesign）を生成するためのルール。

> **位置づけ**: コード生成の第1フェーズ。ここで出力した Markdown が後続のコードレビュー・コード生成・テストの入力となる。

## 生成フロー

```
[Ars プロジェクト JSON]
    ↓ 読み込み
[ルール読み込み: ars.md, platforms.md, project-save-rules.md, 本ルール]
    ↓ 解析
[アクター / ドメイン単位で分解]
    ↓ 生成
[codedesign/ にMDファイルとして出力]
```

## 入力

| ソース | 内容 |
|--------|------|
| プロジェクト JSON | scenes, actors, components, messages, actions, prefabs |
| `spec/ars.md` | 実装ルール・設計思想 |
| `spec/platforms.md` | 対象プラットフォーム定義 |
| `spec/rule/project-save-rules.md` | codedesign のファイル構造・命名規則 |
| 本ルール | 詳細設計の記載内容・粒度 |

## 出力先

`project-save-rules.md` の階層構造に従い `codedesign/` 配下に出力する。

```
codedesign/
├── interfaces/
│   └── {interface-name}.md
├── {scene-name}/
│   ├── _scene.md
│   ├── {actor-name}.md
│   └── {actor-name}/
│       ├── _actor.md
│       └── {child-actor}.md
└── ...
```

## 生成単位

**アクター / ドメイン単位**で1ファイルを生成する。

- 初回: プロジェクト内の全シーン・全アクターを一括生成
- 2回目以降: 変更があったアクター（差分検出）のみ再生成

## 詳細設計ファイルのテンプレート

### アクター設計ファイル（`{actor-name}.md`）

```markdown
# {アクター名}

## メタ情報
- **ID**: {actor-id}
- **タイプ**: simple | state | flexible
- **ドメインロール**: {role}
- **所属シーン**: {scene-name}
- **対象プラットフォーム**: {platform}
- **実装言語**: {language}

## 概要
{requirements.overview の各項目を箇条書き}

## 達成目標
{requirements.goals の各項目を箇条書き}

## 役割
{requirements.role の各項目を箇条書き}

## 挙動
{requirements.behavior の各項目を箇条書き}

## ステート定義
> State 型アクターのみ記載。simple / flexible の場合は「なし」。

| ステート名 | プロセス |
|-----------|---------|
| {state.name} | {state.processes を列挙} |

### ステート遷移
{ステート間の遷移条件・トリガーを記述}

## 表示物（Display）
> Pictor / レンダリングパイプライン連携が必要な場合に記載。

| 表示物名 | 満たす要件 | パイプライン設定 |
|---------|-----------|----------------|
| {display.name} | {satisfies: field[index]} | {pipeline_config} |

### プラットフォーム別レンダリング指示
{platforms.md に基づく対象プラットフォームのレンダリングパイプライン情報}

## コンポジットシステム（コンポーネント構成）

このアクターに結合されるモジュール（コンポーネント）の一覧と、各モジュールの詳細。

### コンポーネント一覧

| コンポーネント名 | カテゴリ | ドメイン | 役割 |
|----------------|---------|---------|------|
| {comp.name} | {comp.category} | {comp.domain} | {概要} |

### 各コンポーネント詳細

#### {コンポーネント名}

**変数（ステート）**:
| 変数名 | 型 | 初期値 | 説明 |
|--------|---|-------|------|
| {var.name} | {var.type} | {var.defaultValue} | |

**タスク（振る舞い）**:
| タスク名 | 説明 | 入力 | 出力 |
|---------|------|------|------|
| {task.name} | {task.description} | {inputs} | {outputs} |

**テストケース**:
{task.testCases があれば列挙}

**依存コンポーネント**: {comp.dependencies}

## メッセージ / インタフェース

### 送信メッセージ（このアクターが送信元）

| メッセージ名 | 送信先 | 種別 | 説明 |
|------------|-------|------|------|
| {msg.name} | {target-actor-name} | simple / interface | {msg.description} |

### 受信メッセージ（このアクターが送信先）

| メッセージ名 | 送信元 | 種別 | 説明 |
|------------|-------|------|------|
| {msg.name} | {source-actor-name} | simple / interface | {msg.description} |

### アクション定義

メッセージに紐づくアクションの詳細。

| アクション名 | 種別 | 説明 | 振る舞い |
|------------|------|------|---------|
| {action.name} | {action.actionType} | {action.description} | {action.behaviors} |

#### 具体実装（Concretes）
| 具体クラス名 | 説明 |
|------------|------|
| {concrete.name} | {concrete.description} |

## 接続データ（Data Organizer 連携）

このアクターが参照・操作するデータスキーマ。

### マスターデータ参照
| スキーマ名 | 参照フィールド | 用途 |
|-----------|-------------|------|
| {schema.name} | {fields} | {どのタスク/変数で使用するか} |

### ユーザーデータ操作
| スキーマ名 | 操作種別 | 用途 |
|-----------|---------|------|
| {schema.name} | 読み取り / 書き込み | {どのタスク/変数で使用するか} |

## UI 連携

このアクターに関わる UI 要素。

| UI 要素 | 表示内容 | バインド先 |
|--------|---------|-----------|
| {UI要素名} | {何を表示するか} | {どの変数/タスクに紐づくか} |

## サブシーン

| 項目 | 値 |
|------|---|
| サブシーン参照 | {sub_scene_id → scene-name、または「なし」} |
| 子アクター数 | {サブシーンが持つアクター数} |

## 依存関係サマリー

```
[このアクター]
  ├── 使用コンポーネント: [{comp1}, {comp2}, ...]
  ├── 送信先アクター:     [{target1}, {target2}, ...]
  ├── 受信元アクター:     [{source1}, {source2}, ...]
  ├── 参照データ:         [{schema1}, {schema2}, ...]
  └── サブシーン:         {scene-name | なし}
```

## プラットフォーム別実装ノート

### {platform} 固有の実装指示
{platforms.md に基づく、このアクター/コンポーネントの実装における
プラットフォーム固有の注意点・パターン・命名規則}
```

### シーン設計ファイル（`_scene.md`）

```markdown
# {シーン名} シーン

## メタ情報
- **ID**: {scene-id}
- **アクター数**: {actors.len()}
- **メッセージ数**: {messages.len()}
- **アクション数**: {actions.len()}
- **対象プラットフォーム**: {platform}

## シーン概要
{このシーンの目的と役割を記述}

## アクター構成

| アクター名 | タイプ | ドメインロール | サブシーン |
|-----------|-------|-------------|----------|
| {actor.name} | {actor.actorType} | {actor.role} | {sub_scene_id | -} |

## メッセージフロー

```
{actor-A} --[message-name]--> {actor-B}
{actor-C} --[message-name]--> {actor-A}
...
```

### メッセージ一覧

| ID | 名前 | 送信元 | 送信先 | 種別 | 説明 |
|----|------|-------|-------|------|------|
| {msg.id} | {msg.name} | {source} | {target} | {messageType} | {description} |

## アクション一覧

| ID | 名前 | 種別 | 説明 |
|----|------|------|------|
| {action.id} | {action.name} | {actionType} | {description} |

## 依存関係グラフ

{project-save-rules.md のグラフ形式に準拠したシーン内依存関係}

## 初期化順序

{アクターの依存関係に基づく推奨初期化順序}
```

### インタフェース定義ファイル（`interfaces/{name}.md`）

```markdown
# {インタフェース名}

## メタ情報
- **ID**: {message-id}
- **種別**: {messageType: simple | interface}
- **送信元**: {source-actor-name} (ID: {source-domain-id})
- **送信先**: {target-actor-name} (ID: {target-domain-id})

## 説明
{description}

## 紐づくアクション
| アクション名 | 種別 | 説明 |
|------------|------|------|
| {action.name} | {actionType} | {description} |

## データ形式

### 入力パラメータ
{アクションの入力ポートから推定、またはメッセージの引数定義}

### 出力パラメータ
{アクションの出力ポートから推定、またはメッセージの戻り値定義}

## プラットフォーム別実装パターン

| プラットフォーム | 実装方式 |
|---------------|---------|
| Unity | UnityEvent / C# Delegate |
| Godot | signal / call_group() |
| Unreal | Delegate / Event Dispatcher |
| Ergo | Port-based Message Passing |
```

## 生成ルール

### R1: 全アクターを網羅する
プロジェクト内の全シーン・全アクターに対して設計ファイルを生成する。
スキップは許可しない。

### R2: 接続情報を完全に記載する
各アクターの設計ファイルには、そのアクターに関わる全てのメッセージ・インタフェース・アクションを記載する。
送受信の両方向を含める。

### R3: コンポーネントの詳細を展開する
アクターに結合されたコンポーネントは、変数・タスク・テストケース・依存関係を全て展開して記載する。
コンポーネントIDの参照だけでは不十分。

### R4: プラットフォーム固有情報を付与する
指定されたターゲットプラットフォームに応じて、以下を記載する：
- 実装言語・ファイル拡張子
- モジュール形式（MonoBehaviour / Node / UObject / TypeScript Module）
- メッセージパッシング方式
- 命名規則（namespace / class prefix）
- レンダリングパイプライン連携

### R5: interface 種別メッセージは必ず interfaces/ にも出力する
`messageType: "interface"` のメッセージは、アクター設計ファイル内の記載に加えて、
`codedesign/interfaces/` にも個別ファイルとして出力する。

### R6: 差分生成をサポートする
2回目以降の生成では、前回生成したファイルとの差分を検出し、
変更があったアクターのみ再生成する。変更検出の基準：
- アクターの requirements / actorStates / displays が変更された
- アクターに接続されたメッセージ・アクションが変更された
- アクターのコンポーネント構成が変更された
- 関連するデータスキーマが変更された

### R7: 空セクションも見出しを残す
該当データがないセクションでも見出しは残し「なし」と記載する。
これにより後からの追記が容易になる。

### R8: Flexible 型アクターの自由記述を保持する
Flexible 型アクターの `flexibleContent` は、設計ファイルに独立セクションとして記載する。

```markdown
## 自由記述（Flexible）
{flexibleContent の内容をそのまま記載}
```

## 命名規則

| 対象 | 形式 | 例 |
|------|------|---|
| シーンディレクトリ | kebab-case | `title-screen/` |
| アクターファイル | kebab-case | `player-character.md` |
| インタフェースファイル | kebab-case | `take-damage.md` |
| シーン定義ファイル | 固定 | `_scene.md` |
| 親アクター定義ファイル | 固定 | `_actor.md` |

## 品質基準

生成された codedesign が以下を満たしていることを確認する：

1. **完全性**: 全アクター・全メッセージ・全コンポーネントが記載されている
2. **整合性**: メッセージの送信元・送信先が対応するアクター設計ファイルで一致している
3. **可読性**: Markdown として正しく、人間が読んで理解できる
4. **トレーサビリティ**: 各要素がプロジェクト JSON の ID で追跡可能
5. **プラットフォーム対応**: 指定プラットフォームの実装指示が具体的
