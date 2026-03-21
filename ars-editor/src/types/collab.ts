/** コラボレーション関連の型定義 */

export interface CollabUser {
  user_id: string;
  display_name: string;
  avatar_url: string;
  color: string;
}

export interface CursorPosition {
  user_id: string;
  x: number;
  y: number;
  scene_id: string | null;
}

export interface LockInfo {
  resource_id: string;
  resource_name: string;
  user_id: string;
  display_name: string;
}

export type CollabMessage =
  | { type: 'join'; user_id: string; display_name: string; avatar_url: string; color: string }
  | { type: 'leave'; user_id: string }
  | { type: 'cursor'; user_id: string; x: number; y: number; scene_id: string | null }
  | { type: 'lock'; user_id: string; resource_id: string; resource_name: string }
  | { type: 'unlock'; user_id: string; resource_id: string }
  | { type: 'room_state'; users: CollabUser[]; locks: LockInfo[] }
  | { type: 'lock_result'; resource_id: string; granted: boolean; held_by: string | null };
