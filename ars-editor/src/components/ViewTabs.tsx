import { useEditorStore, type EditorViewTab } from '@/stores/editorStore';

const TABS: { key: EditorViewTab; label: string }[] = [
  { key: 'scene', label: 'Scene' },
  { key: 'actions', label: 'Actions' },
  { key: 'data', label: 'Data' },
  { key: 'ui', label: 'UI' },
  { key: 'test', label: 'Test' },
];

export function ViewTabs() {
  const activeTab = useEditorStore((s) => s.activeViewTab);
  const setTab = useEditorStore((s) => s.setActiveViewTab);

  return (
    <div
      className="flex items-center gap-0.5 px-2 shrink-0"
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        height: '36px',
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
            style={{
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              background: isActive ? 'var(--bg-surface-2)' : 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              borderRadius: '4px 4px 0 0',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
