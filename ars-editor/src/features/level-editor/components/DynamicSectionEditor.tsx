import { useLevelStore } from '../levelStore';
import { Static2DCanvas } from './Static2DCanvas';
import {
  SOCKET_DIRS_2D,
  SOCKET_DIRS_3D,
  splitMode,
  type Level,
  type PlacedObject2D,
  type SectionPart2D,
  type SectionPart3D,
  type Socket,
  type SocketDir2D,
  type SocketDir3D,
} from '../types';

interface Props {
  level: Level;
}

export function DynamicSectionEditor({ level }: Props) {
  const { dim } = splitMode(level.mode);
  const activeLevelId = useLevelStore((s) => s.activeLevelId);
  const selectedSectionId = useLevelStore((s) => s.selectedSectionId);
  const selectSection = useLevelStore((s) => s.selectSection);
  const updateLevel = useLevelStore((s) => s.updateLevel);

  const sections: (SectionPart2D | SectionPart3D)[] =
    dim === '2d' ? level.sections2d : level.sections3d;

  const addSection2D = useLevelStore((s) => s.addSection2D);
  const addSection3D = useLevelStore((s) => s.addSection3D);
  const deleteSection2D = useLevelStore((s) => s.deleteSection2D);
  const deleteSection3D = useLevelStore((s) => s.deleteSection3D);

  const handleAdd = () => {
    if (!activeLevelId) return;
    const name = `Section ${sections.length + 1}`;
    if (dim === '2d') addSection2D(activeLevelId, name);
    else addSection3D(activeLevelId, name);
  };

  const handleDelete = (id: string) => {
    if (!activeLevelId) return;
    if (dim === '2d') deleteSection2D(activeLevelId, id);
    else deleteSection3D(activeLevelId, id);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header: section size (fixed for all sections) + generation params */}
      <SectionSizeBar level={level} onUpdate={(p) => updateLevel(level.id, p)} />

      {/* Two-pane: section list + section detail */}
      <div className="flex-1 flex overflow-hidden">
        <div
          className="w-56 min-w-[220px] flex flex-col"
          style={{ borderRight: '1px solid var(--border)' }}
        >
          <div
            className="px-3 py-2 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span
              className="text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              Section parts
            </span>
            <button
              className="primary text-xs"
              style={{ padding: '0.2rem 0.5rem' }}
              onClick={handleAdd}
            >
              +
            </button>
          </div>
          <div className="overflow-y-auto p-2 space-y-1 flex-1">
            {sections.length === 0 && (
              <p
                className="text-[11px] text-center py-3"
                style={{ color: 'var(--text-muted)' }}
              >
                No sections yet. Add one to start.
              </p>
            )}
            {sections.map((sec) => {
              const sel = sec.id === selectedSectionId;
              return (
                <div
                  key={sec.id}
                  className="rounded px-2 py-1.5 cursor-pointer text-xs flex items-center justify-between"
                  style={{
                    background: sel ? 'rgba(88,166,255,0.12)' : 'transparent',
                    border:
                      '1px solid ' + (sel ? 'rgba(88,166,255,0.35)' : 'var(--border)'),
                  }}
                  onClick={() => selectSection(sec.id)}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        background: sec.color,
                        borderRadius: 2,
                        display: 'inline-block',
                      }}
                    />
                    <span className="truncate">{sec.name}</span>
                  </span>
                  <button
                    className="text-[10px]"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(sec.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {selectedSectionId ? (
            <SectionDetail level={level} sectionId={selectedSectionId} />
          ) : (
            <div
              className="h-full flex items-center justify-center text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Select a section to edit its sockets and inner objects.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section size header ─────────────────────────────────

function SectionSizeBar({ level, onUpdate }: { level: Level; onUpdate: (p: Partial<Level>) => void }) {
  const { dim } = splitMode(level.mode);
  const size = level.sectionSize;
  const gen = level.generation;
  const setSize = (k: 'width' | 'height' | 'depth', v: number) =>
    onUpdate({ sectionSize: { ...size, [k]: Math.max(8, Math.round(v)) } });
  return (
    <div
      className="px-3 py-2 flex items-end gap-3 flex-wrap"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex flex-col">
        <span
          className="text-[10px] uppercase tracking-wider mb-0.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Section size (fixed)
        </span>
        <div className="flex items-end gap-2">
          <NumField label="W" value={size.width} onChange={(v) => setSize('width', v)} />
          <NumField label="H" value={size.height} onChange={(v) => setSize('height', v)} />
          {dim === '3d' && (
            <NumField label="D" value={size.depth} onChange={(v) => setSize('depth', v)} />
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <span
          className="text-[10px] uppercase tracking-wider mb-0.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Generation
        </span>
        <div className="flex items-end gap-2">
          <NumField
            label="seed"
            value={gen.seed}
            onChange={(v) => onUpdate({ generation: { ...gen, seed: Math.round(v) } })}
          />
          <NumField
            label="count"
            value={gen.targetCount}
            onChange={(v) =>
              onUpdate({ generation: { ...gen, targetCount: Math.max(1, Math.round(v)) } })
            }
          />
          <label className="text-[10px] flex flex-col" style={{ color: 'var(--text-muted)' }}>
            <span>match</span>
            <select
              value={gen.matchingRule}
              className="text-xs px-1 py-0.5 rounded"
              onChange={(e) =>
                onUpdate({
                  generation: {
                    ...gen,
                    matchingRule: e.target.value as 'strict' | 'compatible',
                  },
                })
              }
            >
              <option value="strict">strict</option>
              <option value="compatible">compatible</option>
            </select>
          </label>
        </div>
      </div>
      <div
        className="ml-auto text-[10px] max-w-xs leading-snug"
        style={{ color: 'var(--text-muted)' }}
      >
        Section data requires a fixed size. Sockets define which faces may
        connect — generation tiles parts by socket compatibility, weighted by
        each part's weight.
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-[10px] flex flex-col" style={{ color: 'var(--text-muted)' }}>
      <span>{label}</span>
      <input
        type="number"
        value={value}
        className="w-16 px-1 py-0.5 text-xs rounded"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

// ── Section detail (sockets + inner objects) ─────────────

function SectionDetail({ level, sectionId }: { level: Level; sectionId: string }) {
  const { dim } = splitMode(level.mode);
  const activeLevelId = useLevelStore((s) => s.activeLevelId);
  const updateSection2D = useLevelStore((s) => s.updateSection2D);
  const updateSection3D = useLevelStore((s) => s.updateSection3D);
  const setSocket2D = useLevelStore((s) => s.setSocket2D);
  const setSocket3D = useLevelStore((s) => s.setSocket3D);

  const section: SectionPart2D | SectionPart3D | undefined =
    dim === '2d'
      ? level.sections2d.find((s) => s.id === sectionId)
      : level.sections3d.find((s) => s.id === sectionId);
  if (!section) return null;

  const dirs: (SocketDir2D | SocketDir3D)[] = dim === '2d' ? SOCKET_DIRS_2D : SOCKET_DIRS_3D;

  const handleNameChange = (name: string) => {
    if (!activeLevelId) return;
    if (dim === '2d') updateSection2D(activeLevelId, sectionId, { name });
    else updateSection3D(activeLevelId, sectionId, { name });
  };
  const handleWeightChange = (weight: number) => {
    if (!activeLevelId) return;
    const safe = Math.max(0, weight);
    if (dim === '2d') updateSection2D(activeLevelId, sectionId, { weight: safe });
    else updateSection3D(activeLevelId, sectionId, { weight: safe });
  };
  const handleColorChange = (color: string) => {
    if (!activeLevelId) return;
    if (dim === '2d') updateSection2D(activeLevelId, sectionId, { color });
    else updateSection3D(activeLevelId, sectionId, { color });
  };
  const handleSocketChange = (dir: SocketDir2D | SocketDir3D, socket: Socket) => {
    if (!activeLevelId) return;
    if (dim === '2d') setSocket2D(activeLevelId, sectionId, dir as SocketDir2D, socket);
    else setSocket3D(activeLevelId, sectionId, dir as SocketDir3D, socket);
  };

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-3 py-2 flex items-end gap-3 flex-wrap"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <label className="text-[10px] flex flex-col" style={{ color: 'var(--text-muted)' }}>
          <span>Name</span>
          <input
            value={section.name}
            className="text-xs px-2 py-1 rounded w-44"
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </label>
        <label className="text-[10px] flex flex-col" style={{ color: 'var(--text-muted)' }}>
          <span>Weight</span>
          <input
            type="number"
            value={section.weight}
            className="text-xs px-1 py-1 rounded w-16"
            step={0.1}
            onChange={(e) => handleWeightChange(Number(e.target.value))}
          />
        </label>
        <label className="text-[10px] flex flex-col" style={{ color: 'var(--text-muted)' }}>
          <span>Color</span>
          <input
            type="color"
            value={section.color}
            className="text-xs rounded w-12 h-8 p-0"
            onChange={(e) => handleColorChange(e.target.value)}
          />
        </label>
      </div>

      {/* Socket grid */}
      <div
        className="px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="text-[10px] uppercase tracking-wider mb-1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Sockets — empty value = no connection allowed on that face
        </div>
        <div className="grid grid-cols-2 gap-1.5 max-w-md">
          {dirs.map((dir) => {
            const cur = (section.sockets as Record<string, Socket>)[dir] ?? '';
            return (
              <label
                key={dir}
                className="text-[10px] flex items-center gap-2"
                style={{ color: 'var(--text-muted)' }}
              >
                <span className="w-12 uppercase">{dir}</span>
                <input
                  className="flex-1 text-xs px-1 py-1 rounded"
                  value={cur}
                  placeholder="(none)"
                  onChange={(e) =>
                    handleSocketChange(dir, e.target.value === '' ? null : e.target.value)
                  }
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Inner objects (2D only — 3D inner editing is out of scope for MVP) */}
      {dim === '2d' && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div
            className="px-3 py-1.5 text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
          >
            Inner objects (within fixed section bounds)
          </div>
          <Static2DCanvas
            level={level}
            inner={(section as SectionPart2D).inner}
            width={level.sectionSize.width}
            height={level.sectionSize.height}
            fixedBounds
            onAdd={(obj: Omit<PlacedObject2D, 'id'>) => {
              if (!activeLevelId) return;
              const next = [
                ...(section as SectionPart2D).inner,
                { ...obj, id: crypto.randomUUID() },
              ];
              updateSection2D(activeLevelId, sectionId, { inner: next });
            }}
            onUpdate={(id, patch) => {
              if (!activeLevelId) return;
              const next = (section as SectionPart2D).inner.map((o) =>
                o.id === id ? { ...o, ...patch } : o,
              );
              updateSection2D(activeLevelId, sectionId, { inner: next });
            }}
            onDelete={(id) => {
              if (!activeLevelId) return;
              const next = (section as SectionPart2D).inner.filter((o) => o.id !== id);
              updateSection2D(activeLevelId, sectionId, { inner: next });
            }}
          />
        </div>
      )}
      {dim === '3d' && (
        <div
          className="flex-1 flex items-center justify-center text-xs px-4 text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          3D inner-object editing is not yet supported. Use sockets to define how
          this section connects, and rely on downstream codegen to place inner
          props.
        </div>
      )}
    </div>
  );
}
