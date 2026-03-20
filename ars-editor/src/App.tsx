import { useState, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { EditorPage } from './features/editor-page';
import { ResourceDepotPage } from './features/resource-depot';
import { DataOrganizerPage } from './features/data-organizer';
import { CollabPresence } from './features/node-editor/components/CollabPresence';
import { useAuthStore } from './stores/authStore';
import { useCollabStore } from './stores/collabStore';
import { useProjectStore } from './stores/projectStore';
import { isTauri } from './lib/backend';

type Page = 'editor' | 'depot' | 'data';

const NAV_ITEMS: { key: Page; label: string }[] = [
  { key: 'editor', label: 'Editor' },
  { key: 'depot', label: 'Resource Depot' },
  { key: 'data', label: 'Data Organizer' },
];

function App() {
  const [page, setPage] = useState<Page>('editor');
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const logout = useAuthStore((s) => s.logout);
  const joinRoom = useCollabStore((s) => s.joinRoom);
  const leaveRoom = useCollabStore((s) => s.leaveRoom);
  const collabConnected = useCollabStore((s) => s.connected);
  const collabUsers = useCollabStore((s) => s.users);
  const projectName = useProjectStore((s) => s.project.name);

  // Web版のみ: ユーザー情報を取得
  useEffect(() => {
    if (!isTauri()) {
      fetchUser();
    }
  }, [fetchUser]);

  // ユーザーがログイン中の場合、プロジェクト部屋に自動参加
  useEffect(() => {
    if (!isTauri() && user && projectName) {
      const roomId = `project:${projectName}`;
      joinRoom(roomId, user.id, user.displayName, user.avatarUrl);
      return () => {
        leaveRoom();
      };
    }
  }, [user, projectName, joinRoom, leaveRoom]);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-900 text-zinc-200">
      {/* Global Navigation */}
      <nav className="flex items-center h-9 border-b border-zinc-700 bg-zinc-900 px-2 shrink-0">
        <span className="text-xs font-bold text-white mr-4 tracking-wider">ARS</span>
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => setPage(item.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              page === item.key
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            {item.label}
          </button>
        ))}

        {/* 右側: コラボプレゼンス + ユーザー情報 */}
        <div className="ml-auto flex items-center gap-3">
          {collabConnected && collabUsers.size > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-zinc-500">{collabUsers.size}</span>
              <CollabPresence />
            </div>
          )}
          {!isTauri() && (
            user ? (
              <div className="flex items-center gap-2">
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-5 h-5 rounded-full"
                />
                <span className="text-xs text-zinc-300">{user.displayName}</span>
                <button
                  onClick={logout}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <a
                href="/auth/github/login"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Sign in with GitHub
              </a>
            )
          )}
        </div>
      </nav>

      {/* Page Content */}
      <div className="flex-1 overflow-hidden">
        {page === 'editor' && (
          <ReactFlowProvider>
            <EditorPage />
          </ReactFlowProvider>
        )}
        {page === 'depot' && <ResourceDepotPage />}
        {page === 'data' && <DataOrganizerPage />}
      </div>
    </div>
  );
}

export default App;
