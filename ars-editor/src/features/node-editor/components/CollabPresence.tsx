import { useState } from 'react';
import { useCollabStore } from '@/stores/collabStore';

const VIEW_TAB_LABELS: Record<string, string> = {
  scene: 'Scene',
  actions: 'Actions',
  data: 'Data',
  ui: 'UI',
};

/** 接続中のユーザー一覧（アバター表示 + プレゼンス詳細） */
export function CollabPresence() {
  const users = useCollabStore((s) => s.users);
  const presences = useCollabStore((s) => s.presences);
  const connected = useCollabStore((s) => s.connected);
  const [expanded, setExpanded] = useState(false);

  if (!connected) return null;

  const userList = Array.from(users.values());
  if (userList.length === 0) return null;

  return (
    <div className="flex items-center gap-1 relative">
      {/* アバター一覧 */}
      {userList.map((user) => {
        const presence = presences.get(user.user_id);
        return (
          <div
            key={user.user_id}
            className="relative group"
            title={user.display_name}
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.display_name}
                className="w-6 h-6 rounded-full border-2"
                style={{ borderColor: user.color }}
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2"
                style={{ backgroundColor: user.color, borderColor: user.color }}
              >
                {user.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            {/* プレゼンスのドットインジケータ: シーン操作中 */}
            {presence?.scene_name && (
              <div
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-zinc-900"
                style={{ backgroundColor: user.color }}
              />
            )}
            {/* ホバー時のツールチップ（プレゼンス情報付き） */}
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
              style={{ backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}
            >
              <div className="font-semibold" style={{ color: user.color }}>{user.display_name}</div>
              {presence && (
                <div className="mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  <div>{VIEW_TAB_LABELS[presence.view_tab] ?? presence.view_tab}</div>
                  {presence.scene_name && <div>Scene: {presence.scene_name}</div>}
                  {presence.selected_node_names.length > 0 && (
                    <div>Editing: {presence.selected_node_names.join(', ')}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* 展開ボタン */}
      {userList.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-colors"
          style={{
            background: expanded ? 'var(--accent)' : 'var(--bg-surface-2)',
            color: expanded ? 'white' : 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
          title="Show collaborator details"
        >
          {expanded ? '×' : userList.length}
        </button>
      )}

      {/* 展開パネル: 全ユーザーのプレゼンス詳細 */}
      {expanded && (
        <div
          className="absolute top-full right-0 mt-1 rounded-lg shadow-xl z-50 min-w-[240px] p-2"
          style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)' }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Online ({userList.length})
          </div>
          {userList.map((user) => {
            const presence = presences.get(user.user_id);
            return (
              <div
                key={user.user_id}
                className="flex items-start gap-2 py-1.5 border-b last:border-b-0"
                style={{ borderColor: 'var(--border)' }}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.display_name}
                    className="w-5 h-5 rounded-full border-2 shrink-0 mt-0.5"
                    style={{ borderColor: user.color }}
                  />
                ) : (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 shrink-0 mt-0.5"
                    style={{ backgroundColor: user.color, borderColor: user.color }}
                  >
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate" style={{ color: user.color }}>
                    {user.display_name}
                  </div>
                  {presence ? (
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      <span>{VIEW_TAB_LABELS[presence.view_tab] ?? presence.view_tab}</span>
                      {presence.scene_name && (
                        <span> / {presence.scene_name}</span>
                      )}
                      {presence.selected_node_names.length > 0 && (
                        <div className="truncate">
                          Editing: {presence.selected_node_names.join(', ')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Idle
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
