import { useLevelStore } from '../levelStore';
import { splitMode, type Level } from '../types';

interface Props {
  level: Level;
}

export function LevelInspector({ level }: Props) {
  const { dim, gen } = splitMode(level.mode);
  const selectedObjectId = useLevelStore((s) => s.selectedObjectId);
  const updateLevel = useLevelStore((s) => s.updateLevel);
  const updateObject2D = useLevelStore((s) => s.updateObject2D);
  const updateObject3D = useLevelStore((s) => s.updateObject3D);

  const obj2 = dim === '2d' ? level.objects2d.find((o) => o.id === selectedObjectId) : null;
  const obj3 = dim === '3d' ? level.objects3d.find((o) => o.id === selectedObjectId) : null;

  return (
    <div className="flex flex-col h-full text-xs">
      <div
        className="px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h3
          className="text-[10px] uppercase tracking-wider mb-2"
          style={{ color: 'var(--text-muted)' }}
        >
          Level
        </h3>
        <Field label="Name">
          <input
            value={level.name}
            className="text-xs px-2 py-1 rounded w-full"
            onChange={(e) => updateLevel(level.id, { name: e.target.value })}
          />
        </Field>
        <Field label="Mode">
          <span style={{ color: 'var(--text)' }}>{level.mode}</span>
        </Field>
        {gen === 'static' && (
          <>
            <Field label="World W">
              <input
                type="number"
                value={level.worldSize.width}
                className="text-xs px-2 py-1 rounded w-full"
                onChange={(e) =>
                  updateLevel(level.id, {
                    worldSize: { ...level.worldSize, width: Math.max(1, Number(e.target.value)) },
                  })
                }
              />
            </Field>
            <Field label="World H">
              <input
                type="number"
                value={level.worldSize.height}
                className="text-xs px-2 py-1 rounded w-full"
                onChange={(e) =>
                  updateLevel(level.id, {
                    worldSize: { ...level.worldSize, height: Math.max(1, Number(e.target.value)) },
                  })
                }
              />
            </Field>
            {dim === '3d' && (
              <Field label="World D">
                <input
                  type="number"
                  value={level.worldSize.depth}
                  className="text-xs px-2 py-1 rounded w-full"
                  onChange={(e) =>
                    updateLevel(level.id, {
                      worldSize: {
                        ...level.worldSize,
                        depth: Math.max(1, Number(e.target.value)),
                      },
                    })
                  }
                />
              </Field>
            )}
          </>
        )}
      </div>

      {/* Object inspector */}
      {gen === 'static' && (obj2 || obj3) && (
        <div
          className="px-3 py-2 flex-1 overflow-y-auto"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h3
            className="text-[10px] uppercase tracking-wider mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Selected object
          </h3>
          {obj2 && (
            <>
              <Field label="Name">
                <input
                  value={obj2.name}
                  className="text-xs px-2 py-1 rounded w-full"
                  onChange={(e) =>
                    updateObject2D(level.id, obj2.id, { name: e.target.value })
                  }
                />
              </Field>
              {(['x', 'y', 'w', 'h'] as const).map((k) => (
                <Field key={k} label={k.toUpperCase()}>
                  <input
                    type="number"
                    value={obj2[k]}
                    className="text-xs px-2 py-1 rounded w-full"
                    onChange={(e) =>
                      updateObject2D(level.id, obj2.id, { [k]: Number(e.target.value) })
                    }
                  />
                </Field>
              ))}
              <Field label="Color">
                <input
                  type="color"
                  value={obj2.color}
                  className="rounded"
                  onChange={(e) => updateObject2D(level.id, obj2.id, { color: e.target.value })}
                />
              </Field>
              <Field label="Tag">
                <input
                  value={obj2.tag ?? ''}
                  className="text-xs px-2 py-1 rounded w-full"
                  onChange={(e) =>
                    updateObject2D(level.id, obj2.id, { tag: e.target.value || undefined })
                  }
                />
              </Field>
            </>
          )}
          {obj3 && (
            <>
              <Field label="Name">
                <input
                  value={obj3.name}
                  className="text-xs px-2 py-1 rounded w-full"
                  onChange={(e) =>
                    updateObject3D(level.id, obj3.id, { name: e.target.value })
                  }
                />
              </Field>
              {(['x', 'y', 'z', 'w', 'h', 'd'] as const).map((k) => (
                <Field key={k} label={k.toUpperCase()}>
                  <input
                    type="number"
                    value={obj3[k]}
                    className="text-xs px-2 py-1 rounded w-full"
                    onChange={(e) =>
                      updateObject3D(level.id, obj3.id, { [k]: Number(e.target.value) })
                    }
                  />
                </Field>
              ))}
              <Field label="Color">
                <input
                  type="color"
                  value={obj3.color}
                  className="rounded"
                  onChange={(e) => updateObject3D(level.id, obj3.id, { color: e.target.value })}
                />
              </Field>
              <Field label="Tag">
                <input
                  value={obj3.tag ?? ''}
                  className="text-xs px-2 py-1 rounded w-full"
                  onChange={(e) =>
                    updateObject3D(level.id, obj3.id, { tag: e.target.value || undefined })
                  }
                />
              </Field>
            </>
          )}
        </div>
      )}

      {/* Export */}
      <div className="px-3 py-2 mt-auto">
        <button
          className="w-full text-xs primary"
          style={{ padding: '0.4rem' }}
          onClick={() => downloadLevel(level)}
        >
          Export JSON
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label
      className="text-[10px] block mb-2"
      style={{ color: 'var(--text-muted)' }}
    >
      <span className="block mb-0.5 uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}

function downloadLevel(level: Level) {
  const json = JSON.stringify(level, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${level.name.replace(/\s+/g, '_')}.level.json`;
  a.click();
  URL.revokeObjectURL(url);
}
