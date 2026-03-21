/** WebSocketベースのコラボレーションクライアント */

import type { CollabMessage } from '@/types/collab';

export type MessageHandler = (msg: CollabMessage) => void;

export class CollabClient {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private cursorThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  private lastCursorSent = 0;
  private params: { room: string; user_id: string; display_name: string; avatar_url: string } | null = null;

  connect(room: string, userId: string, displayName: string, avatarUrl: string) {
    this.params = { room, user_id: userId, display_name: displayName, avatar_url: avatarUrl };
    this.doConnect();
  }

  private doConnect() {
    if (!this.params) return;
    this.cleanup();

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const qs = new URLSearchParams({
      room: this.params.room,
      user_id: this.params.user_id,
      display_name: this.params.display_name,
      avatar_url: this.params.avatar_url,
    });
    const url = `${proto}//${location.host}/ws/collab?${qs}`;

    this.ws = new WebSocket(url);

    this.ws.onmessage = (ev) => {
      try {
        const msg: CollabMessage = JSON.parse(ev.data);
        this.handlers.forEach((h) => h(msg));
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.doConnect(), 3000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect() {
    this.params = null;
    this.cleanup();
  }

  private cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.cursorThrottleTimer) {
      clearTimeout(this.cursorThrottleTimer);
      this.cursorThrottleTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  private send(msg: CollabMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  /** カーソル位置を送信（50ms間隔にスロットル） */
  sendCursor(x: number, y: number, sceneId: string | null) {
    const now = Date.now();
    if (now - this.lastCursorSent < 50) {
      if (!this.cursorThrottleTimer) {
        this.cursorThrottleTimer = setTimeout(() => {
          this.cursorThrottleTimer = null;
          this.sendCursor(x, y, sceneId);
        }, 50);
      }
      return;
    }
    this.lastCursorSent = now;
    this.send({
      type: 'cursor',
      user_id: '', // サーバー側で上書きされる
      x,
      y,
      scene_id: sceneId,
    });
  }

  /** ファイルロックを要求 */
  requestLock(resourceId: string, resourceName: string) {
    this.send({
      type: 'lock',
      user_id: '',
      resource_id: resourceId,
      resource_name: resourceName,
    });
  }

  /** ファイルロックを解除 */
  releaseLock(resourceId: string) {
    this.send({
      type: 'unlock',
      user_id: '',
      resource_id: resourceId,
    });
  }
}

/** シングルトンインスタンス */
export const collabClient = new CollabClient();
