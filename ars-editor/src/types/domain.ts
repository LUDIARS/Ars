// Domain types — auto-generated from Rust (ars-core).
// Edit crates/ars-core/src/models/ and run ./scripts/generate-types.sh to update.

export type {
  Actor,
  Component,
  Connection,
  KeyBinding,
  PortDefinition,
  Position,
  Prefab,
  PrefabActor,
  Project,
  Scene,
  SceneState,
  SequenceStep,
  Task,
  Variable,
} from './generated';

// TS-only convenience types (not in Rust)
export type ActorRole = 'actor' | 'scene' | 'sequence';
export type ComponentCategory = 'UI' | 'Logic' | 'System' | 'GameObject';
