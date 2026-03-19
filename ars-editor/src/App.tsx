import { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { EditorPage } from './features/editor-page';
import { ResourceDepotPage } from './features/resource-depot';
import { DataOrganizerPage } from './features/data-organizer';

type Page = 'editor' | 'depot' | 'data';

const NAV_ITEMS: { key: Page; label: string }[] = [
  { key: 'editor', label: 'Editor' },
  { key: 'depot', label: 'Resource Depot' },
  { key: 'data', label: 'Data Organizer' },
];

function App() {
  const [page, setPage] = useState<Page>('editor');

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
