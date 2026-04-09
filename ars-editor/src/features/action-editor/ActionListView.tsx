import { useState, useCallback } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import type { ActionType } from '@/types/generated/ActionType';

const ACTION_TYPE_LABELS: Record<ActionType, { label: string; color: string }> = {
  interface: { label: 'Interface', color: 'var(--accent)' },
  usecase: { label: 'UseCase', color: 'var(--green)' },
  event: { label: 'Event', color: 'var(--orange)' },
};

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
      baseClass: '',
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
      {/* Header */}
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

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {actions.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            アクションがありません。<br />
            「+ Action」で追加してください。
          </div>
        ) : (
          actions.map((action) => {
            const isEditing = editingId === action.id;
            const typeInfo = ACTION_TYPE_LABELS[action.actionType];

            return (
              <div
                key={action.id}
                className="rounded-lg p-3"
                style={{
                  background: 'var(--bg-surface)',
                  border: isEditing ? '1px solid var(--accent)' : '1px solid var(--border)',
                }}
              >
                {isEditing ? (
                  <ActionEditForm
                    action={action}
                    sceneId={activeSceneId!}
                    onSave={(updates) => {
                      updateAction(activeSceneId!, action.id, updates);
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div
                    className="cursor-pointer"
                    onClick={() => setEditingId(action.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        {action.name}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          color: typeInfo.color,
                          background: `color-mix(in srgb, ${typeInfo.color} 15%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${typeInfo.color} 30%, transparent)`,
                        }}
                      >
                        {typeInfo.label}
                      </span>
                    </div>
                    {action.baseClass && (
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        extends <span style={{ color: 'var(--purple)' }}>{action.baseClass}</span>
                      </div>
                    )}
                    {action.description && (
                      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {action.description}
                      </div>
                    )}
                    {/* メッセージとの紐付き表示 */}
                    {activeScene && (() => {
                      const linked = activeScene.messages.filter(m => m.actionIds.includes(action.id));
                      if (linked.length === 0) return null;
                      return (
                        <div className="text-[10px] mt-1.5 flex gap-1 flex-wrap">
                          {linked.map(m => (
                            <span
                              key={m.id}
                              className="px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)' }}
                            >
                              {m.name || '(unnamed)'}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Delete */}
                {!isEditing && (
                  <div className="flex justify-end mt-2">
                    <button
                      className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{
                        color: 'var(--red)',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        fontSize: '9px',
                        padding: '2px 6px',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (action.name && !confirm(`「${action.name}」を削除しますか？`)) return;
                        removeAction(activeSceneId!, action.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Inline Edit Form ──────────────────────────────────────

function ActionEditForm({
  action,
  sceneId,
  onSave,
  onCancel,
}: {
  action: { id: string; name: string; actionType: ActionType; description: string; baseClass: string };
  sceneId: string;
  onSave: (updates: { name: string; actionType: ActionType; description: string; baseClass: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(action.name);
  const [actionType, setActionType] = useState<ActionType>(action.actionType);
  const [description, setDescription] = useState(action.description);
  const [baseClass, setBaseClass] = useState(action.baseClass);
  // sceneId is available for future use (e.g., linking to messages)
  void sceneId;

  return (
    <div className="space-y-2">
      {/* Name */}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Action name..."
        className="w-full"
        style={{ fontSize: '0.85rem' }}
        autoFocus
      />

      {/* Type selector */}
      <div className="flex gap-1.5">
        {(['interface', 'usecase', 'event'] as ActionType[]).map((t) => {
          const info = ACTION_TYPE_LABELS[t];
          const isActive = actionType === t;
          return (
            <button
              key={t}
              onClick={() => setActionType(t)}
              className="flex-1 text-xs py-1.5 rounded transition-colors"
              style={{
                color: isActive ? info.color : 'var(--text-muted)',
                background: isActive ? `color-mix(in srgb, ${info.color} 15%, transparent)` : 'var(--bg)',
                border: isActive ? `1px solid ${info.color}` : '1px solid var(--border)',
              }}
            >
              {info.label}
            </button>
          );
        })}
      </div>

      {/* Base class */}
      <input
        type="text"
        value={baseClass}
        onChange={(e) => setBaseClass(e.target.value)}
        placeholder="Interface / Base class (e.g. IAction)"
        className="w-full"
        style={{ fontSize: '0.8rem' }}
      />

      {/* Description */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="説明..."
        rows={2}
        className="w-full resize-none"
        style={{ fontSize: '0.8rem' }}
      />

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave({ name, actionType, description, baseClass })}
          className="primary"
          style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
