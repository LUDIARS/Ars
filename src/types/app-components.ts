// === アプリケーションレイヤ汎用コンポーネント定義 ===
// シンプルな処理かつアプリケーションレイヤでよく使われるパターンのプリセット

import type { Component, Variable, Task, PortDefinition } from './domain';

// ---------------------------------------------------------------------------
// 1. インスタンス/スポナー (Spawner)
//    指定されたアクターを動的に生成・配置するコンポーネント
// ---------------------------------------------------------------------------
export const SpawnerComponent: Omit<Component, 'id'> = {
  name: 'Spawner',
  category: 'Logic',
  domain: 'Application',
  variables: [
    { name: 'prefabId', type: 'string' },
    { name: 'spawnCount', type: 'number', defaultValue: 1 },
    { name: 'interval', type: 'number', defaultValue: 0 },
    { name: 'maxInstances', type: 'number', defaultValue: -1 },
    { name: 'activeInstances', type: 'string[]', defaultValue: [] },
  ],
  tasks: [
    {
      name: 'Spawn',
      description: 'プレハブIDに基づきアクターインスタンスを生成する',
      inputs: [
        { name: 'trigger', type: 'signal' },
        { name: 'position', type: 'Vector3' },
      ],
      outputs: [
        { name: 'spawnedId', type: 'string' },
        { name: 'onSpawned', type: 'signal' },
      ],
    },
    {
      name: 'DespawnAll',
      description: 'このスポナーが生成した全インスタンスを破棄する',
      inputs: [{ name: 'trigger', type: 'signal' }],
      outputs: [{ name: 'onCleared', type: 'signal' }],
    },
  ],
  dependencies: [],
};

// ---------------------------------------------------------------------------
// 2. イベントトリガー (EventTrigger)
//    条件を満たしたときにイベントを発火するコンポーネント
// ---------------------------------------------------------------------------
export const EventTriggerComponent: Omit<Component, 'id'> = {
  name: 'EventTrigger',
  category: 'Logic',
  domain: 'Application',
  variables: [
    { name: 'eventName', type: 'string' },
    { name: 'conditionExpr', type: 'string', defaultValue: '' },
    { name: 'once', type: 'boolean', defaultValue: false },
    { name: 'fired', type: 'boolean', defaultValue: false },
  ],
  tasks: [
    {
      name: 'Evaluate',
      description: '条件式を評価し、真ならイベントを発火する',
      inputs: [
        { name: 'trigger', type: 'signal' },
        { name: 'value', type: 'any' },
      ],
      outputs: [
        { name: 'onFired', type: 'signal' },
        { name: 'eventPayload', type: 'any' },
      ],
    },
    {
      name: 'Reset',
      description: '発火状態をリセットし再度トリガー可能にする',
      inputs: [{ name: 'trigger', type: 'signal' }],
      outputs: [{ name: 'onReset', type: 'signal' }],
    },
  ],
  dependencies: [],
};

// ---------------------------------------------------------------------------
// 3. ステート (StateMachine)
//    有限ステートマシンによる状態遷移を管理するコンポーネント
// ---------------------------------------------------------------------------
export const StateMachineComponent: Omit<Component, 'id'> = {
  name: 'StateMachine',
  category: 'Logic',
  domain: 'Application',
  variables: [
    { name: 'currentState', type: 'string', defaultValue: '' },
    { name: 'previousState', type: 'string', defaultValue: '' },
    { name: 'states', type: 'string[]', defaultValue: [] },
    {
      name: 'transitions',
      type: '{ from: string; to: string; event: string }[]',
      defaultValue: [],
    },
  ],
  tasks: [
    {
      name: 'Transition',
      description: 'イベント名に基づきステートを遷移させる',
      inputs: [
        { name: 'event', type: 'string' },
      ],
      outputs: [
        { name: 'newState', type: 'string' },
        { name: 'onTransition', type: 'signal' },
      ],
    },
    {
      name: 'ForceState',
      description: '強制的に指定ステートへ切り替える',
      inputs: [
        { name: 'state', type: 'string' },
      ],
      outputs: [
        { name: 'newState', type: 'string' },
        { name: 'onTransition', type: 'signal' },
      ],
    },
  ],
  dependencies: [],
};

// ---------------------------------------------------------------------------
// 4. 破棄/遅延破棄 (Destroyer)
//    アクターの即時破棄または遅延破棄を行うコンポーネント
// ---------------------------------------------------------------------------
export const DestroyerComponent: Omit<Component, 'id'> = {
  name: 'Destroyer',
  category: 'System',
  domain: 'Application',
  variables: [
    { name: 'delay', type: 'number', defaultValue: 0 },
    { name: 'pending', type: 'boolean', defaultValue: false },
  ],
  tasks: [
    {
      name: 'Destroy',
      description: 'このアクターを即時破棄する',
      inputs: [{ name: 'trigger', type: 'signal' }],
      outputs: [{ name: 'onBeforeDestroy', type: 'signal' }],
    },
    {
      name: 'DestroyDelayed',
      description: '指定秒数後にこのアクターを破棄する',
      inputs: [
        { name: 'trigger', type: 'signal' },
        { name: 'delay', type: 'number' },
      ],
      outputs: [
        { name: 'onScheduled', type: 'signal' },
        { name: 'onBeforeDestroy', type: 'signal' },
      ],
    },
    {
      name: 'CancelDestroy',
      description: '遅延破棄をキャンセルする',
      inputs: [{ name: 'trigger', type: 'signal' }],
      outputs: [{ name: 'onCancelled', type: 'signal' }],
    },
  ],
  dependencies: [],
};

// ---------------------------------------------------------------------------
// 5. 演出/タイムライン (Timeline)
//    時間軸に沿ったキーフレームベースの演出再生コンポーネント
// ---------------------------------------------------------------------------
export const TimelineComponent: Omit<Component, 'id'> = {
  name: 'Timeline',
  category: 'Logic',
  domain: 'Application',
  variables: [
    { name: 'duration', type: 'number', defaultValue: 1 },
    { name: 'currentTime', type: 'number', defaultValue: 0 },
    { name: 'loop', type: 'boolean', defaultValue: false },
    { name: 'playing', type: 'boolean', defaultValue: false },
    {
      name: 'keyframes',
      type: '{ time: number; value: any; easing: string }[]',
      defaultValue: [],
    },
  ],
  tasks: [
    {
      name: 'Play',
      description: 'タイムラインを先頭から再生する',
      inputs: [{ name: 'trigger', type: 'signal' }],
      outputs: [
        { name: 'onStart', type: 'signal' },
        { name: 'progress', type: 'number' },
      ],
    },
    {
      name: 'Pause',
      description: '再生を一時停止する',
      inputs: [{ name: 'trigger', type: 'signal' }],
      outputs: [{ name: 'onPause', type: 'signal' }],
    },
    {
      name: 'Stop',
      description: '再生を停止し先頭に戻す',
      inputs: [{ name: 'trigger', type: 'signal' }],
      outputs: [{ name: 'onStop', type: 'signal' }],
    },
    {
      name: 'Seek',
      description: '指定時刻にジャンプする',
      inputs: [
        { name: 'trigger', type: 'signal' },
        { name: 'time', type: 'number' },
      ],
      outputs: [
        { name: 'currentTime', type: 'number' },
        { name: 'value', type: 'any' },
      ],
    },
  ],
  dependencies: [],
};

// ---------------------------------------------------------------------------
// プリセット一覧
// ---------------------------------------------------------------------------

/** アプリケーションレイヤ汎用コンポーネントのプリセット定義 */
export const APP_COMPONENT_PRESETS: readonly Omit<Component, 'id'>[] = [
  SpawnerComponent,
  EventTriggerComponent,
  StateMachineComponent,
  DestroyerComponent,
  TimelineComponent,
] as const;

/**
 * プリセットからコンポーネントを生成する。
 * 新規IDを割り振り、プロジェクトに追加可能な Component を返す。
 */
export function createComponentFromPreset(
  preset: Omit<Component, 'id'>,
): Component {
  return {
    id: crypto.randomUUID(),
    ...preset,
  };
}
