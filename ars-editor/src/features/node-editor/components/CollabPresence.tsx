import { useCollabStore } from '@/stores/collabStore';

/** 接続中のユーザー一覧（アバター表示） */
export function CollabPresence() {
  const users = useCollabStore((s) => s.users);
  const connected = useCollabStore((s) => s.connected);

  if (!connected) return null;

  const userList = Array.from(users.values());
  if (userList.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {userList.map((user) => (
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
          {/* ホバー時のツールチップ */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
            style={{ backgroundColor: user.color }}
          >
            {user.display_name}
          </div>
        </div>
      ))}
    </div>
  );
}
