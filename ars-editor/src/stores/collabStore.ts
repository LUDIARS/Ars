import { create } from 'zustand';
import type { CollabUser, CursorPosition, LockInfo, CollabMessage } from '@/types/collab';
import { collabClient } from '@/lib/collab-client';

interface CollabState {
  connected: boolean;
  roomId: string | null;
  users: Map<string, CollabUser>;
  cursors: Map<string, CursorPosition>;
  locks: Map<string, LockInfo>;
}

interface CollabActions {
  joinRoom: (roomId: string, userId: string, displayName: string, avatarUrl: string) => void;
  leaveRoom: () => void;
  sendCursor: (x: number, y: number, sceneId: string | null) => void;
  requestLock: (resourceId: string, resourceName: string) => void;
  releaseLock: (resourceId: string) => void;
  handleMessage: (msg: CollabMessage) => void;
}

export const useCollabStore = create<CollabState & CollabActions>()((set, get) => {
  let unsubscribe: (() => void) | null = null;

  return {
    connected: false,
    roomId: null,
    users: new Map(),
    cursors: new Map(),
    locks: new Map(),

    joinRoom: (roomId, userId, displayName, avatarUrl) => {
      // 前の接続をクリーンアップ
      if (unsubscribe) {
        unsubscribe();
      }
      collabClient.disconnect();

      unsubscribe = collabClient.onMessage((msg) => {
        get().handleMessage(msg);
      });

      collabClient.connect(roomId, userId, displayName, avatarUrl);
      set({
        connected: true,
        roomId,
        users: new Map(),
        cursors: new Map(),
        locks: new Map(),
      });
    },

    leaveRoom: () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      collabClient.disconnect();
      set({
        connected: false,
        roomId: null,
        users: new Map(),
        cursors: new Map(),
        locks: new Map(),
      });
    },

    sendCursor: (x, y, sceneId) => {
      collabClient.sendCursor(x, y, sceneId);
    },

    requestLock: (resourceId, resourceName) => {
      collabClient.requestLock(resourceId, resourceName);
    },

    releaseLock: (resourceId) => {
      collabClient.releaseLock(resourceId);
    },

    handleMessage: (msg) => {
      switch (msg.type) {
        case 'room_state': {
          const users = new Map<string, CollabUser>();
          for (const u of msg.users) {
            users.set(u.user_id, u);
          }
          const locks = new Map<string, LockInfo>();
          for (const l of msg.locks) {
            locks.set(l.resource_id, l);
          }
          set({ users, locks });
          break;
        }
        case 'join': {
          const users = new Map(get().users);
          users.set(msg.user_id, {
            user_id: msg.user_id,
            display_name: msg.display_name,
            avatar_url: msg.avatar_url,
            color: msg.color,
          });
          set({ users });
          break;
        }
        case 'leave': {
          const users = new Map(get().users);
          users.delete(msg.user_id);
          const cursors = new Map(get().cursors);
          cursors.delete(msg.user_id);
          // ユーザーのロックも削除
          const locks = new Map(get().locks);
          for (const [key, lock] of locks) {
            if (lock.user_id === msg.user_id) {
              locks.delete(key);
            }
          }
          set({ users, cursors, locks });
          break;
        }
        case 'cursor': {
          const cursors = new Map(get().cursors);
          cursors.set(msg.user_id, {
            user_id: msg.user_id,
            x: msg.x,
            y: msg.y,
            scene_id: msg.scene_id,
          });
          set({ cursors });
          break;
        }
        case 'lock': {
          const locks = new Map(get().locks);
          const user = get().users.get(msg.user_id);
          locks.set(msg.resource_id, {
            resource_id: msg.resource_id,
            resource_name: msg.resource_name,
            user_id: msg.user_id,
            display_name: user?.display_name ?? msg.user_id,
          });
          set({ locks });
          break;
        }
        case 'unlock': {
          const locks = new Map(get().locks);
          locks.delete(msg.resource_id);
          set({ locks });
          break;
        }
        case 'lock_result': {
          // ロック結果の通知（将来的にトースト通知などに使用可能）
          break;
        }
      }
    },
  };
});
