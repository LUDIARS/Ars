import { useState, useCallback } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import type { Action, ConcreteAction } from '@/types/domain';
import { generateId } from '@/lib/utils';

export function ActionListView() {
  const project = useProjectStore((s) => s.project);
  const activeSceneId = project.activeSceneId;
  const activeScene = activeSceneId ? project.scenes[activeSceneId] : null;
  const addAction = useProjectStore((s) => s.addAction);
  const removeAction = useProjectStore((s) => s.removeAction);
  const updateAction = useProjectStore((s) => s.updateAction);

  const [editingId, setEditingId] = useState<string | null>(null);
  const actions = activeScene ? Object.values(activeScene.actions) : [];

  const handleAdd = useCallback(() => {
    if (!activeSceneId) return;
    const id = addAction(activeSceneId, {
      name: 'NewAction',
      actionType: 'interface',
      description: '',
      behaviors: [],
      concretes: [],
    });
    setEditingId(id);
  }, [activeSceneId, addAction]);

  if (!activeScene) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        シーンを選択してください
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Actions</span>
          <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>({actions.length})</span>
        </div>
        <button
          onClick={handleAdd}
          className="primary"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
        >
          + Action
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {actions.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            アクションがありません。<br />
            「+ Action」で追加してください。
          </div>
        ) : (
          actions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              scene={activeScene}
              isEditing={editingId === action.id}
              onEdit={() => setEditingId(action.id)}
              onSave={(updates) => {
                updateAction(activeSceneId!, action.id, updates);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
              onDelete={() => {
                if (action.name && !confirm(`「${action.name}」を削除しますか？`)) return;
                removeAction(activeSceneId!, action.id);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Action Card ──────────────────────────────────────

function ActionCard({
  action,
  scene,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  action: Action;
  scene: { messages: Array<{ id: string; name: string; actionIds: string[] }> };
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<Action>) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const linkedMessages = scene.messages.filter(m => m.actionIds.includes(action.id));

  if (isEditing) {
    return (
      <div
        className="rounded-lg p-3"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--accent)' }}
      >
        <ActionEditForm action={action} onSave={onSave} onCancel={onCancel} />
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-3 cursor-pointer transition-colors"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      onClick={onEdit}
    >
      <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>{action.name}</div>
      {action.description && (
        <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{action.description}</div>
      )}

      {/* なにをするか */}
      <div className="mb-2 rounded p-2" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--accent)' }}>
          なにをするか
        </div>
        {action.behaviors.length > 0 ? (
          action.behaviors.map((b, i) => (
            <div key={i} className="text-xs" style={{ color: 'var(--text)' }}>• {b}</div>
          ))
        ) : (
          <div className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>未定義</div>
        )}
      </div>

      {/* 具体 */}
      <div className="rounded p-2" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--green)' }}>
          具体
        </div>
        {action.concretes.length > 0 ? (
          action.concretes.map((c) => (
            <div key={c.id} className="text-xs">
              <span style={{ color: 'var(--green)' }}>{c.name}</span>
              {c.description && <span style={{ color: 'var(--text-muted)' }}> — {c.description}</span>}
            </div>
          ))
        ) : (
          <div className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>実装なし</div>
        )}
      </div>

      {linkedMessages.length > 0 && (
        <div className="text-[10px] mt-2 flex gap-1 flex-wrap">
          {linkedMessages.map(m => (
            <span
              key={m.id}
              className="px-1.5 py-0.5 rounded"
              style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)' }}
            >
              {m.name || '(unnamed)'}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-end mt-2">
        <button
          className="text-[9px] rounded"
          style={{ color: 'var(--red)', background: 'transparent', border: '1px solid var(--border)', padding: '2px 6px' }}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Edit Form ────────────────────────────────────────

function ActionEditForm({
  action,
  onSave,
  onCancel,
}: {
  action: Action;
  onSave: (updates: Partial<Action>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(action.name);
  const [description, setDescription] = useState(action.description);
  const [behaviors, setBehaviors] = useState(action.behaviors.join('\n'));
  const [concretes, setConcretes] = useState<ConcreteAction[]>(action.concretes);

  const addConcrete = () => {
    setConcretes([...concretes, { id: generateId(), name: '', description: '' }]);
  };

  const updateConcrete = (id: string, updates: Partial<ConcreteAction>) => {
    setConcretes(concretes.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeConcrete = (id: string) => {
    setConcretes(concretes.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Action name..."
        autoFocus
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="説明..."
        rows={2}
        className="w-full resize-none"
      />

      {/* なにをするか */}
      <div className="rounded p-2.5" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>
          なにをするか (1行1つ)
        </div>
        <textarea
          value={behaviors}
          onChange={(e) => setBehaviors(e.target.value)}
          placeholder="ターゲットにダメージを与える&#10;攻撃エフェクトを再生する&#10;ヒットログを記録する"
          rows={4}
          className="w-full resize-none"
        />
      </div>

      {/* 具体 */}
      <div className="rounded p-2.5" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--green)' }}>
            具体 (Implementations)
          </div>
          <button
            onClick={addConcrete}
            className="text-[10px] px-2 py-0.5 rounded"
            style={{ color: 'var(--green)', border: '1px solid var(--border)', background: 'transparent' }}
          >
            + 追加
          </button>
        </div>
        {concretes.length === 0 ? (
          <div className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>
            「+ 追加」で具体実装を定義
          </div>
        ) : (
          <div className="space-y-2">
            {concretes.map((c) => (
              <div key={c.id} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => updateConcrete(c.id, { name: e.target.value })}
                    placeholder="クラス名 (e.g. SwordAttack)"
                    style={{ fontSize: '0.8rem' }}
                  />
                  <input
                    type="text"
                    value={c.description}
                    onChange={(e) => updateConcrete(c.id, { description: e.target.value })}
                    placeholder="説明..."
                    style={{ fontSize: '0.75rem' }}
                  />
                </div>
                <button
                  onClick={() => removeConcrete(c.id)}
                  className="text-[9px] px-1 py-0.5 rounded shrink-0 mt-1"
                  style={{ color: 'var(--red)', border: '1px solid var(--border)', background: 'transparent' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>
          Cancel
        </button>
        <button
          onClick={() => onSave({
            name,
            description,
            behaviors: behaviors.split('\n').map(s => s.trim()).filter(Boolean),
            concretes,
          })}
          className="primary"
          style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
