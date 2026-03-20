use crate::models::module_definition::*;

/// アプリケーションレイヤ汎用コンポーネントのプリセットを返す
pub fn app_component_presets() -> Vec<ModuleDefinition> {
    vec![
        spawner_preset(),
        event_trigger_preset(),
        state_machine_preset(),
        destroyer_preset(),
        timeline_preset(),
    ]
}

// ---------------------------------------------------------------------------
// 1. インスタンス/スポナー
// ---------------------------------------------------------------------------
fn spawner_preset() -> ModuleDefinition {
    ModuleDefinition {
        id: "app-preset-spawner".to_string(),
        name: "Spawner".to_string(),
        summary: "指定されたアクターを動的に生成・配置するコンポーネント".to_string(),
        category: ModuleCategory::Logic,
        domain: "Application".to_string(),
        required_data: vec![
            "生成対象のプレハブID".to_string(),
            "生成位置".to_string(),
        ],
        variables: vec![
            VariableDefinition {
                name: "prefabId".to_string(),
                var_type: "string".to_string(),
                description: Some("生成対象のプレハブID".to_string()),
            },
            VariableDefinition {
                name: "spawnCount".to_string(),
                var_type: "number".to_string(),
                description: Some("一度に生成するインスタンス数".to_string()),
            },
            VariableDefinition {
                name: "interval".to_string(),
                var_type: "number".to_string(),
                description: Some("連続生成時の間隔（秒）".to_string()),
            },
            VariableDefinition {
                name: "maxInstances".to_string(),
                var_type: "number".to_string(),
                description: Some("最大インスタンス数（-1で無制限）".to_string()),
            },
            VariableDefinition {
                name: "activeInstances".to_string(),
                var_type: "string[]".to_string(),
                description: Some("現在生成中のインスタンスID一覧".to_string()),
            },
        ],
        dependencies: vec![],
        tasks: vec![
            TaskDefinition {
                name: "Spawn".to_string(),
                description: "プレハブIDに基づきアクターインスタンスを生成する".to_string(),
                inputs: vec![
                    PortDefinition { name: "trigger".to_string(), port_type: "signal".to_string() },
                    PortDefinition { name: "position".to_string(), port_type: "Vector3".to_string() },
                ],
                outputs: vec![
                    PortDefinition { name: "spawnedId".to_string(), port_type: "string".to_string() },
                    PortDefinition { name: "onSpawned".to_string(), port_type: "signal".to_string() },
                ],
            },
            TaskDefinition {
                name: "DespawnAll".to_string(),
                description: "このスポナーが生成した全インスタンスを破棄する".to_string(),
                inputs: vec![
                    PortDefinition { name: "trigger".to_string(), port_type: "signal".to_string() },
                ],
                outputs: vec![
                    PortDefinition { name: "onCleared".to_string(), port_type: "signal".to_string() },
                ],
            },
        ],
        tests: vec![
            TestCase { description: "Spawn実行後にactiveInstancesにIDが追加されること".to_string() },
            TestCase { description: "maxInstances到達時にSpawnが抑制されること".to_string() },
            TestCase { description: "DespawnAll後にactiveInstancesが空になること".to_string() },
        ],
        source_path: None,
        source_repo: None,
    }
}

// ---------------------------------------------------------------------------
// 2. イベントトリガー
// ---------------------------------------------------------------------------
fn event_trigger_preset() -> ModuleDefinition {
    ModuleDefinition {
        id: "app-preset-event-trigger".to_string(),
        name: "EventTrigger".to_string(),
        summary: "条件を満たしたときにイベントを発火するコンポーネント".to_string(),
        category: ModuleCategory::Logic,
        domain: "Application".to_string(),
        required_data: vec![
            "評価対象の値".to_string(),
            "条件式".to_string(),
        ],
        variables: vec![
            VariableDefinition {
                name: "eventName".to_string(),
                var_type: "string".to_string(),
                description: Some("発火するイベントの名前".to_string()),
            },
            VariableDefinition {
                name: "conditionExpr".to_string(),
                var_type: "string".to_string(),
                description: Some("評価する条件式".to_string()),
            },
            VariableDefinition {
                name: "once".to_string(),
                var_type: "boolean".to_string(),
                description: Some("一度だけ発火するかどうか".to_string()),
            },
            VariableDefinition {
                name: "fired".to_string(),
                var_type: "boolean".to_string(),
                description: Some("発火済みフラグ".to_string()),
            },
        ],
        dependencies: vec![],
        tasks: vec![
            TaskDefinition {
                name: "Evaluate".to_string(),
                description: "条件式を評価し、真ならイベントを発火する".to_string(),
                inputs: vec![
                    PortDefinition { name: "trigger".to_string(), port_type: "signal".to_string() },
                    PortDefinition { name: "value".to_string(), port_type: "any".to_string() },
                ],
                outputs: vec![
                    PortDefinition { name: "onFired".to_string(), port_type: "signal".to_string() },
                    PortDefinition { name: "eventPayload".to_string(), port_type: "any".to_string() },
                ],
            },
            TaskDefinition {
                name: "Reset".to_string(),
                description: "発火状態をリセットし再度トリガー可能にする".to_string(),
                inputs: vec![
                    PortDefinition { name: "trigger".to_string(), port_type: "signal".to_string() },
                ],
                outputs: vec![
                    PortDefinition { name: "onReset".to_string(), port_type: "signal".to_string() },
                ],
            },
        ],
        tests: vec![
            TestCase { description: "条件が真のときにonFiredが発火すること".to_string() },
            TestCase { description: "once=trueのとき2回目以降は発火しないこと".to_string() },
            TestCase { description: "Reset後に再度発火可能になること".to_string() },
        ],
        source_path: None,
        source_repo: None,
    }
}

// ---------------------------------------------------------------------------
// 3. ステートマシン
// ---------------------------------------------------------------------------
fn state_machine_preset() -> ModuleDefinition {
    ModuleDefinition {
        id: "app-preset-state-machine".to_string(),
        name: "StateMachine".to_string(),
        summary: "有限ステートマシンによる状態遷移を管理するコンポーネント".to_string(),
        category: ModuleCategory::Logic,
        domain: "Application".to_string(),
        required_data: vec![
            "ステート一覧".to_string(),
            "遷移ルール".to_string(),
        ],
        variables: vec![
            VariableDefinition {
                name: "currentState".to_string(),
                var_type: "string".to_string(),
                description: Some("現在のステート名".to_string()),
            },
            VariableDefinition {
                name: "previousState".to_string(),
                var_type: "string".to_string(),
                description: Some("直前のステート名".to_string()),
            },
            VariableDefinition {
                name: "states".to_string(),
                var_type: "string[]".to_string(),
                description: Some("定義済みステート名の一覧".to_string()),
            },
            VariableDefinition {
                name: "transitions".to_string(),
                var_type: "{ from: string; to: string; event: string }[]".to_string(),
                description: Some("遷移ルール定義".to_string()),
            },
        ],
        dependencies: vec![],
        tasks: vec![
            TaskDefinition {
                name: "Transition".to_string(),
                description: "イベント名に基づきステートを遷移させる".to_string(),
                inputs: vec![
                    PortDefinition { name: "event".to_string(), port_type: "string".to_string() },
                ],
                outputs: vec![
                    PortDefinition { name: "newState".to_string(), port_type: "string".to_string() },
                    PortDefinition { name: "onTransition".to_string(), port_type: "signal".to_string() },
                ],
            },
            TaskDefinition {
                name: "ForceState".to_string(),
                description: "強制的に指定ステートへ切り替える".to_string(),
                inputs: vec![
                    PortDefinition { name: "state".to_string(), port_type: "string".to_string() },
                ],
                outputs: vec![
                    PortDefinition { name: "newState".to_string(), port_type: "string".to_string() },
                    PortDefinition { name: "onTransition".to_string(), port_type: "signal".to_string() },
                ],
            },
        ],
        tests: vec![
            TestCase { description: "有効な遷移イベントでステートが切り替わること".to_string() },
            TestCase { description: "無効な遷移イベントではステートが変わらないこと".to_string() },
            TestCase { description: "ForceStateで任意のステートに即座に切り替わること".to_string() },
        ],
        source_path: None,
        source_repo: None,
    }
}

// ---------------------------------------------------------------------------
// 4. 破棄/遅延破棄
// ---------------------------------------------------------------------------
fn destroyer_preset() -> ModuleDefinition {
    ModuleDefinition {
        id: "app-preset-destroyer".to_string(),
        name: "Destroyer".to_string(),
        summary: "アクターの即時破棄または遅延破棄を行うコンポーネント".to_string(),
        category: ModuleCategory::System,
        domain: "Application".to_string(),
        required_data: vec![],
        variables: vec![
            VariableDefinition {
                name: "delay".to_string(),
                var_type: "number".to_string(),
                description: Some("遅延破棄の待機時間（秒）".to_string()),
            },
            VariableDefinition {
                name: "pending".to_string(),
                var_type: "boolean".to_string(),
                description: Some("遅延破棄が予約済みかどうか".to_string()),
            },
        ],
        dependencies: vec![],
        tasks: vec![
            TaskDefinition {
                name: "Destroy".to_string(),
                description: "このアクターを即時破棄する".to_string(),
                inputs: vec![
                    PortDefinition { name: "trigger".to_string(), port_type: "signal".to_string() },
                ],
                outputs: vec![
                    PortDefinition { name: "onBeforeDestroy".to_string(), port_type: "signal".to_string() },
                ],
            },
            TaskDefinition {
                name: "DestroyDelayed".to_string(),
                description: "指定秒数後にこのアクターを破棄する".to_string(),
                inputs: vec![
                    PortDefinition { name: "trigger".to_string(), port_type: "signal".to_string() },
                    PortDefinition { name: "delay".to_string(), port_type: "number".to_string() },
                ],
                outputs: vec![
                    PortDefinition { name: "onScheduled".to_string(), port_type: "signal".to_string() },
                    PortDefinition { name: "onBeforeDestroy".to_string(), port_type: "signal".to_string() },
                ],
            },
            TaskDefinition {
                name: "CancelDestroy".to_string(),
                description: "遅延破棄をキャンセルする".to_string(),
                inputs: vec![
                    PortDefinition { name: "trigger".to_string(), port_type: "signal".to_string() },
                ],
                outputs: vec![
                    PortDefinition { name: "onCancelled".to_string(), port_type: "signal".to_string() },
                ],
            },
        ],
        tests: vec![
            TestCase { description: "Destroy実行でアクターが即座に破棄されること".to_string() },
            TestCase { description: "DestroyDelayed実行で指定秒後に破棄されること".to_string() },
            TestCase { description: "CancelDestroyで予約済みの破棄がキャンセルされること".to_string() },
        ],
        source_path: None,
        source_repo: None,
    }
}

// ---------------------------------------------------------------------------
// 5. 演出/タイムライン
// ---------------------------------------------------------------------------
fn timeline_preset() -> ModuleDefinition {
    ModuleDefinition {
        id: "app-preset-timeline".to_string(),
        name: "Timeline".to_string(),
        summary: "時間軸に沿ったキーフレームベースの演出再生コンポーネント".to_string(),
        category: ModuleCategory::Logic,
        domain: "Application".to_string(),
        required_data: vec![
            "キーフレームデータ".to_string(),
            "再生パラメータ".to_string(),
        ],
        variables: vec![
            VariableDefinition {
                name: "duration".to_string(),
                var_type: "number".to_string(),
                description: Some("タイムラインの全体長（秒）".to_string()),
            },
            VariableDefinition {
                name: "currentTime".to_string(),
                var_type: "number".to_string(),
                description: Some("現在の再生位置（秒）".to_string()),
            },
            VariableDefinition {
                name: "loop".to_string(),
                var_type: "boolean".to_string(),
                description: Some("ループ再生するかどうか".to_string()),
            },
            VariableDefinition {
                name: "playing".to_string(),
                var_type: "boolean".to_string(),
                description: Some("再生中かどうか".to_string()),
            },
            VariableDefinition {
                name: "keyframes".to_string(),
                var_type: "{ time: number; value: any; easing: string }[]".to_string(),
                description: Some("キーフレーム定義の配列".to_string()),
            },
        ],
        dependencies: vec![],
        tasks: vec![
            TaskDefinition {
                name: "Play".to_string(),
                description: "タイムラインを先頭から再生する".to_string(),
                inputs: vec![
                    PortDefinition { name: "trigger".to_string(), port_type: "signal".to_string() },
                ],
                outputs: vec![
                    PortDefinition { name: "onStart".to_string(), port_type: "signal".to_string() },
                    PortDefinition { name: "progress".to_string(), port_type: "number".to_string() },
                ],
            },
            TaskDefinition {
                name: "Pause".to_string(),
                description: "再生を一時停止する".to_string(),
                inputs: vec![
                    PortDefinition { name: "trigger".to_string(), port_type: "signal".to_string() },
                ],
                outputs: vec![
                    PortDefinition { name: "onPause".to_string(), port_type: "signal".to_string() },
                ],
            },
            TaskDefinition {
                name: "Stop".to_string(),
                description: "再生を停止し先頭に戻す".to_string(),
                inputs: vec![
                    PortDefinition { name: "trigger".to_string(), port_type: "signal".to_string() },
                ],
                outputs: vec![
                    PortDefinition { name: "onStop".to_string(), port_type: "signal".to_string() },
                ],
            },
            TaskDefinition {
                name: "Seek".to_string(),
                description: "指定時刻にジャンプする".to_string(),
                inputs: vec![
                    PortDefinition { name: "trigger".to_string(), port_type: "signal".to_string() },
                    PortDefinition { name: "time".to_string(), port_type: "number".to_string() },
                ],
                outputs: vec![
                    PortDefinition { name: "currentTime".to_string(), port_type: "number".to_string() },
                    PortDefinition { name: "value".to_string(), port_type: "any".to_string() },
                ],
            },
        ],
        tests: vec![
            TestCase { description: "Play実行で再生が開始されること".to_string() },
            TestCase { description: "Pause実行で再生位置が保持されたまま停止すること".to_string() },
            TestCase { description: "Stop実行でcurrentTimeが0にリセットされること".to_string() },
            TestCase { description: "Seek実行で指定時刻の値が出力されること".to_string() },
            TestCase { description: "loop=trueのとき終端到達後に先頭から再開すること".to_string() },
        ],
        source_path: None,
        source_repo: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_component_presets_count() {
        let presets = app_component_presets();
        assert_eq!(presets.len(), 5);
    }

    #[test]
    fn test_preset_ids_are_unique() {
        let presets = app_component_presets();
        let ids: Vec<&str> = presets.iter().map(|p| p.id.as_str()).collect();
        let mut unique = ids.clone();
        unique.sort();
        unique.dedup();
        assert_eq!(ids.len(), unique.len());
    }

    #[test]
    fn test_spawner_preset() {
        let presets = app_component_presets();
        let spawner = presets.iter().find(|p| p.name == "Spawner").unwrap();
        assert_eq!(spawner.category, ModuleCategory::Logic);
        assert_eq!(spawner.domain, "Application");
        assert_eq!(spawner.variables.len(), 5);
        assert_eq!(spawner.tasks.len(), 2);
    }

    #[test]
    fn test_destroyer_is_system_category() {
        let presets = app_component_presets();
        let destroyer = presets.iter().find(|p| p.name == "Destroyer").unwrap();
        assert_eq!(destroyer.category, ModuleCategory::System);
    }

    #[test]
    fn test_timeline_has_four_tasks() {
        let presets = app_component_presets();
        let timeline = presets.iter().find(|p| p.name == "Timeline").unwrap();
        assert_eq!(timeline.tasks.len(), 4);
    }
}
