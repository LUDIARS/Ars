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

/** ユーザーが現在フォーカスしているシーン/オブジェクトの情報 */
export interface UserPresence {
  user_id: string;
  scene_id: string | null;
  scene_name: string | null;
  selected_node_ids: string[];
  selected_node_names: string[];
  view_tab: string;
}

export type CollabMessage =
  | { type: 'join'; user_id: string; display_name: string; avatar_url: string; color: string }
  | { type: 'leave'; user_id: string }
  | { type: 'cursor'; user_id: string; x: number; y: number; scene_id: string | null }
  | { type: 'presence'; user_id: string; scene_id: string | null; scene_name: string | null; selected_node_ids: string[]; selected_node_names: string[]; view_tab: string }
  | { type: 'lock'; user_id: string; resource_id: string; resource_name: string }
  | { type: 'unlock'; user_id: string; resource_id: string }
  | { type: 'room_state'; users: CollabUser[]; locks: LockInfo[]; presences: UserPresence[] }
  | { type: 'lock_result'; resource_id: string; granted: boolean; held_by: string | null };
