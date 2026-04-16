import { useMemo, useState } from 'react';
import { useTestStore } from '../testStore';
import { generateId } from '@/lib/utils';
import type { ErgoPriority, TestModule, TestModuleCategory } from '../types';
import { MODULE_CATEGORY_ORDER } from '../types';

/**
 * 右ペイン: テストモジュール（テスト用のパーツ）一覧。
 *
 * - プロジェクト内モジュール (`test/modules/`) と
 *   レジストリ（`LUDIARS/Ars-TestModule`）同期モジュールを同一ビューで扱う。
 * - 選択したモジュールを、中央ペインで開いているテストの `moduleIds` に追加する。
 */
export function TestModulePanel() {
  const modules = useTestStore((s) => s.modules);
  const upsertModule = useTestStore((s) => s.upsertModule);
  const removeModule = useTestStore((s) => s.removeModule);

  const selectedTestId = useTestStore((s) => s.selectedTestId);
  const activeKind = useTestStore((s) => s.activeKind);
  const upsertFunctional = useTestStore((s) => s.upsertFunctionalTest);
  const upsertIntegration = useTestStore((s) => s.upsertIntegrationTest);
  const functionalTests = useTestStore((s) => s.functionalTests);
  const integrationTests = useTestStore((s) => s.integrationTests);

  const [filter, setFilter] = useState<TestModuleCategory | 'all'>('all');

  const grouped = useMemo(() => {
    const entries = Object.values(modules).filter(
      (m) => filter === 'all' || m.category === filter,
    );
    const out: Record<TestModuleCategory, TestModule[]> = {
      Movement: [],
      Input: [],
      UI: [],
      Dialogue: [],
      Battle: [],
      Resource: [],
      Custom: [],
    };
    for (const m of entries) {
      out[m.category].push(m);
    }
    return out;
  }, [modules, filter]);

  const attachedIds = useMemo(() => {
    if (!selectedTestId) return new Set<string>();
    const t =
      activeKind === 'functional'
        ? functionalTests[selectedTestId]
        : integrationTests[selectedTestId];
    return new Set(t?.moduleIds ?? []);
  }, [selectedTestId, activeKind, functionalTests, integrationTests]);

  const toggleAttach = (moduleId: string) => {
    if (!selectedTestId) return;
    if (activeKind === 'functional') {
      const t = functionalTests[selectedTestId];
      if (!t) return;
      const next = attachedIds.has(moduleId)
        ? t.moduleIds.filter((id) => id !== moduleId)
        : [...t.moduleIds, moduleId];
      upsertFunctional({ ...t, moduleIds: next });
    } else {
      const t = integrationTests[selectedTestId];
      if (!t) return;
      const next = attachedIds.has(moduleId)
        ? t.moduleIds.filter((id) => id !== moduleId)
        : [...t.moduleIds, moduleId];
      upsertIntegration({ ...t, moduleIds: next });
    }
  };

  const addCustomModule = () => {
    const id = generateId();
    upsertModule({
      id,
      name: `Module${Object.keys(modules).length + 1}`,
      category: 'Custom',
      ergoPriority: 'mid',
      targetComponents: [],
      description: '',
      source: 'project',
    });
  };

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        width: 280,
        minWidth: 240,
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
          Test Modules
        </span>
        <button
          onClick={addCustomModule}
          className="text-[10px] px-2 py-0.5 rounded"
          style={{
            color: 'var(--text-muted)',
            background: 'transparent',
            border: '1px solid var(--border)',
          }}
          title="プロジェクト固有のテストモジュールを追加"
        >
          + New
        </button>
      </div>

      <div
        className="flex items-center gap-1 px-2 py-1 overflow-x-auto shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <CategoryChip
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          label="All"
        />
        {MODULE_CATEGORY_ORDER.map((c) => (
          <CategoryChip
            key={c}
            active={filter === c}
            onClick={() => setFilter(c)}
            label={c}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {Object.values(grouped).every((list) => list.length === 0) ? (
          <div
            className="text-[11px] p-3 text-center"
            style={{ color: 'var(--text-muted)' }}
          >
            テストモジュールがありません。
            <br />
            <code>Ars-TestModule</code> リポジトリを同期するか、
            <br />
            「+ New」で独自モジュールを追加してください。
          </div>
        ) : (
          MODULE_CATEGORY_ORDER.map((c) => {
            const list = grouped[c];
            if (list.length === 0) return null;
            return (
              <section key={c}>
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {c}
                </div>
                <div className="space-y-1">
                  {list.map((m) => (
                    <ModuleRow
                      key={m.id}
                      module={m}
                      attached={attachedIds.has(m.id)}
                      canAttach={Boolean(selectedTestId)}
                      onToggle={() => toggleAttach(m.id)}
                      onChange={(updates) => upsertModule({ ...m, ...updates })}
                      onDelete={() => {
                        if (confirm(`テストモジュール「${m.name}」を削除しますか？`)) {
                          removeModule(m.id);
                        }
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] px-2 py-0.5 rounded whitespace-nowrap"
      style={{
        color: active ? 'var(--text)' : 'var(--text-muted)',
        background: active ? 'var(--bg-surface-2)' : 'transparent',
        border: '1px solid var(--border)',
      }}
    >
      {label}
    </button>
  );
}

function ModuleRow({
  module: mod,
  attached,
  canAttach,
  onToggle,
  onChange,
  onDelete,
}: {
  module: TestModule;
  attached: boolean;
  canAttach: boolean;
  onToggle: () => void;
  onChange: (updates: Partial<TestModule>) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="rounded p-2"
      style={{
        background: 'var(--bg)',
        border: attached ? '1px solid var(--accent)' : '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <input
          type="text"
          value={mod.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="flex-1"
          style={{ fontSize: '0.75rem', padding: '2px 4px' }}
        />
        <button
          onClick={onToggle}
          disabled={!canAttach}
          className="text-[10px] px-2 py-0.5 rounded shrink-0"
          style={{
            color: attached ? 'var(--accent)' : 'var(--text-muted)',
            background: 'transparent',
            border: '1px solid var(--border)',
            opacity: canAttach ? 1 : 0.4,
          }}
          title={attached ? '外す' : 'このテストに追加'}
        >
          {attached ? '✓' : '+'}
        </button>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <select
          value={mod.ergoPriority}
          onChange={(e) => onChange({ ergoPriority: e.target.value as ErgoPriority })}
          style={{ fontSize: '0.65rem', padding: '1px 2px' }}
          title="Ergo 表現の優先度"
        >
          <option value="high">Ergo:high</option>
          <option value="mid">Ergo:mid</option>
          <option value="low">Ergo:low</option>
        </select>
        <span
          className="text-[10px]"
          style={{ color: 'var(--text-muted)' }}
          title={mod.source === 'registry' ? mod.registryRepo : undefined}
        >
          {mod.source === 'registry' ? 'registry' : 'project'}
        </span>
        <div className="flex-1" />
        <button
          onClick={onDelete}
          className="text-[9px] px-1 rounded"
          style={{
            color: 'var(--red)',
            background: 'transparent',
            border: '1px solid var(--border)',
          }}
        >
          ×
        </button>
      </div>

      <textarea
        value={mod.description}
        onChange={(e) => onChange({ description: e.target.value })}
        rows={2}
        placeholder="例: キャラクターを自由に移動させる"
        className="w-full resize-none mt-1"
        style={{ fontSize: '0.7rem' }}
      />
    </div>
  );
}
