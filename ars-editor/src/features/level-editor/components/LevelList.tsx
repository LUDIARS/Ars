import { useState } from 'react';
import { useLevelStore } from '../levelStore';
import { TEMPLATE_LABEL } from '../types';

interface Props {
  onCreateRequest: () => void;
}

export function LevelList({ onCreateRequest }: Props) {
  const levels = useLevelStore((s) => s.levels);
  const activeLevelId = useLevelStore((s) => s.activeLevelId);
  const setActiveLevel = useLevelStore((s) => s.setActiveLevel);
  const renameLevel = useLevelStore((s) => s.renameLevel);
  const deleteLevel = useLevelStore((s) => s.deleteLevel);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const list = Object.values(levels);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: 'var(--text-muted)' }}
        >
          Levels
        </h2>
        <button
          className="primary w-full"
          style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
          onClick={onCreateRequest}
        >
          + New Level
        </button>
      </div>

      <div className="overflow-y-auto p-2 space-y-1 flex-1">
        {list.length === 0 ? (
          <p
            className="text-sm text-center py-4"
            style={{ color: 'var(--text-muted)' }}
          >
            No levels yet — pick a template to start.
          </p>
        ) : (
          list.map((lvl) => {
            const isActive = lvl.id === activeLevelId;
            const isEditing = editingId === lvl.id;
            return (
              <div
                key={lvl.id}
                className="rounded px-2 py-1.5 cursor-pointer text-xs"
                style={{
                  background: isActive ? 'rgba(88,166,255,0.12)' : 'transparent',
                  border: '1px solid ' + (isActive ? 'rgba(88,166,255,0.35)' : 'var(--border)'),
                  color: 'var(--text)',
                }}
                onClick={() => setActiveLevel(lvl.id)}
              >
                <div className="flex items-center justify-between gap-1">
                  {isEditing ? (
                    <input
                      autoFocus
                      className="flex-1 text-xs px-1 py-0.5 rounded"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={() => {
                        renameLevel(lvl.id, draftName.trim() || lvl.name);
                        setEditingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          renameLevel(lvl.id, draftName.trim() || lvl.name);
                          setEditingId(null);
                        }
                      }}
                    />
                  ) : (
                    <span
                      className="truncate flex-1"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingId(lvl.id);
                        setDraftName(lvl.name);
                      }}
                    >
                      {lvl.name}
                    </span>
                  )}
                  <button
                    className="text-[10px]"
                    style={{ color: 'var(--text-muted)' }}
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete level "${lvl.name}"?`)) deleteLevel(lvl.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div
                  className="text-[10px] mt-0.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {TEMPLATE_LABEL[lvl.mode]}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
