import { useMemo } from 'react';
import { useTestStore } from '../testStore';
import { useProjectStore } from '@/stores/projectStore';
import type { TestKind, TestStatus } from '../types';
import { TEST_KIND_LABEL, TEST_STATUS_COLOR } from '../types';

const KIND_TABS: TestKind[] = ['functional', 'integration'];

function StatusDot({ status }: { status: TestStatus }) {
  return (
    <span
      aria-label={status}
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: TEST_STATUS_COLOR[status],
        marginRight: 6,
      }}
    />
  );
}

export function TestList() {
  const activeKind = useTestStore((s) => s.activeKind);
  const setActiveKind = useTestStore((s) => s.setActiveKind);
  const selectedTestId = useTestStore((s) => s.selectedTestId);
  const selectTest = useTestStore((s) => s.selectTest);

  const functionalTests = useTestStore((s) => s.functionalTests);
  const integrationTests = useTestStore((s) => s.integrationTests);
  const createFunctionalTest = useTestStore((s) => s.createFunctionalTest);
  const createIntegrationTest = useTestStore((s) => s.createIntegrationTest);

  const activeSceneId = useProjectStore((s) => s.project.activeSceneId);
  const scenes = useProjectStore((s) => s.project.scenes);

  const entries = useMemo(() => {
    if (activeKind === 'functional') {
      return Object.values(functionalTests).map((t) => ({
        id: t.id,
        title: t.targetPath || '(未指定)',
        subtitle: t.requirement || '要件未記入',
        status: t.lastStatus,
      }));
    }
    return Object.values(integrationTests).map((t) => ({
      id: t.id,
      title: t.name,
      subtitle: scenes[t.sceneId]?.name ?? '(missing scene)',
      status: t.lastStatus,
    }));
  }, [activeKind, functionalTests, integrationTests, scenes]);

  const handleAdd = () => {
    if (activeKind === 'functional') {
      const id = createFunctionalTest('', '');
      selectTest(id);
      return;
    }
    if (!activeSceneId) return;
    const id = createIntegrationTest(activeSceneId, 'New Flow');
    selectTest(id);
  };

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        width: 260,
        minWidth: 220,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Kind tabs */}
      <div
        className="flex items-center gap-0.5 px-2 shrink-0"
        style={{ height: 32, borderBottom: '1px solid var(--border)' }}
      >
        {KIND_TABS.map((k) => {
          const active = activeKind === k;
          return (
            <button
              key={k}
              onClick={() => setActiveKind(k)}
              className="px-2 py-1 text-xs rounded-t"
              style={{
                color: active ? 'var(--text)' : 'var(--text-muted)',
                background: active ? 'var(--bg-surface-2)' : 'transparent',
                border: 'none',
                borderBottom: active
                  ? '2px solid var(--accent)'
                  : '2px solid transparent',
              }}
            >
              {TEST_KIND_LABEL[k]}
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={handleAdd}
          className="text-xs px-2 py-0.5 rounded"
          style={{
            color: 'var(--text-muted)',
            background: 'transparent',
            border: '1px solid var(--border)',
          }}
          title={
            activeKind === 'functional'
              ? '機能テストを追加'
              : '統合テストを追加（アクティブシーンが必要）'
          }
          disabled={activeKind === 'integration' && !activeSceneId}
        >
          +
        </button>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div
            className="p-4 text-xs text-center"
            style={{ color: 'var(--text-muted)' }}
          >
            {activeKind === 'functional'
              ? 'コード生成後に機能テストが自動生成されます。'
              : 'シーンを選んで統合テストを追加してください。'}
          </div>
        ) : (
          <ul className="m-0 p-0 list-none">
            {entries.map((e) => {
              const active = selectedTestId === e.id;
              return (
                <li
                  key={e.id}
                  onClick={() => selectTest(e.id)}
                  className="cursor-pointer px-3 py-2"
                  style={{
                    background: active ? 'var(--bg-surface-2)' : 'transparent',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div className="flex items-center text-xs" style={{ color: 'var(--text)' }}>
                    <StatusDot status={e.status} />
                    <span className="truncate">{e.title}</span>
                  </div>
                  <div
                    className="text-[10px] truncate mt-0.5"
                    style={{ color: 'var(--text-muted)', paddingLeft: 14 }}
                  >
                    {e.subtitle}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
