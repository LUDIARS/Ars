import { useCollabStore } from '@/stores/collabStore';

interface CollabCursorsProps {
  activeSceneId: string | null;
}

/** 他のユーザーのカーソル位置をキャンバス上にオーバーレイ表示 */
export function CollabCursors({ activeSceneId }: CollabCursorsProps) {
  const cursors = useCollabStore((s) => s.cursors);
  const users = useCollabStore((s) => s.users);

  const visibleCursors = Array.from(cursors.values()).filter(
    (c) => c.scene_id === activeSceneId,
  );

  if (visibleCursors.length === 0) return null;

  return (
    <svg className="absolute inset-0 pointer-events-none z-50 overflow-visible">
      {visibleCursors.map((cursor) => {
        const user = users.get(cursor.user_id);
        if (!user) return null;
        return (
          <g
            key={cursor.user_id}
            transform={`translate(${cursor.x}, ${cursor.y})`}
            style={{ transition: 'transform 80ms linear' }}
          >
            {/* カーソルアイコン（SVG矢印） */}
            <path
              d="M0 0 L0 16 L4.5 12 L8.5 20 L11 19 L7 11 L13 11 Z"
              fill={user.color}
              stroke="white"
              strokeWidth="1"
              opacity="0.9"
            />
            {/* ユーザー名ラベル */}
            <g transform="translate(14, 18)">
              <rect
                x="0"
                y="0"
                width={user.display_name.length * 7 + 12}
                height="18"
                rx="4"
                fill={user.color}
                opacity="0.85"
              />
              <text
                x="6"
                y="13"
                fontSize="11"
                fontFamily="sans-serif"
                fill="white"
                fontWeight="500"
              >
                {user.display_name}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
