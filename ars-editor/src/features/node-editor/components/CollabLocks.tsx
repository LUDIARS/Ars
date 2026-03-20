import { useCollabStore } from '@/stores/collabStore';

/** ファイルロック状態の可視化パネル */
export function CollabLocks() {
  const locks = useCollabStore((s) => s.locks);
  const users = useCollabStore((s) => s.users);
  const connected = useCollabStore((s) => s.connected);

  if (!connected) return null;

  const lockList = Array.from(locks.values());
  if (lockList.length === 0) return null;

  return (
    <div className="absolute bottom-2 left-2 z-50 bg-zinc-800/90 border border-zinc-600 rounded-lg p-2 max-w-[240px] backdrop-blur-sm">
      <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
        Locked
      </div>
      {lockList.map((lock) => {
        const user = users.get(lock.user_id);
        const color = user?.color ?? '#888';
        return (
          <div
            key={lock.resource_id}
            className="flex items-center gap-1.5 py-0.5 text-xs"
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-zinc-300 truncate">{lock.resource_name}</span>
            <span className="text-zinc-500 ml-auto shrink-0">
              {lock.display_name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
