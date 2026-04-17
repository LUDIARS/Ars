import { useState } from 'react';
import { useLevelStore } from '../levelStore';
import { splitMode } from '../types';
import { LevelList } from './LevelList';
import { LevelTemplatePicker } from './LevelTemplatePicker';
import { Static2DCanvas } from './Static2DCanvas';
import { Static3DCanvas } from './Static3DCanvas';
import { DynamicSectionEditor } from './DynamicSectionEditor';
import { LevelInspector } from './LevelInspector';

export function LevelViewLayout() {
  const levels = useLevelStore((s) => s.levels);
  const activeLevelId = useLevelStore((s) => s.activeLevelId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const level = activeLevelId ? levels[activeLevelId] : null;

  return (
    <div className="flex-1 flex overflow-hidden">
      <div
        className="w-56 min-w-[224px] flex flex-col"
        style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-surface-2, #18212f)' }}
      >
        <LevelList onCreateRequest={() => setPickerOpen(true)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {level ? (
          <CanvasFor level={level} />
        ) : (
          <EmptyState onCreateRequest={() => setPickerOpen(true)} />
        )}
      </div>

      {level && (
        <div
          className="w-72 min-w-[260px] flex flex-col"
          style={{ borderLeft: '1px solid var(--border)', background: 'var(--bg-surface-2, #18212f)' }}
        >
          <LevelInspector level={level} />
        </div>
      )}

      {pickerOpen && <LevelTemplatePicker onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

function CanvasFor({ level }: { level: ReturnType<typeof useLevelStore.getState>['levels'][string] }) {
  const { dim, gen } = splitMode(level.mode);
  if (gen === 'dynamic') return <DynamicSectionEditor level={level} />;
  if (dim === '2d') return <Static2DCanvas level={level} />;
  return <Static3DCanvas level={level} />;
}

function EmptyState({ onCreateRequest }: { onCreateRequest: () => void }) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center p-8 text-center"
      style={{ color: 'var(--text-muted)' }}
    >
      <div className="text-sm mb-3">No level selected.</div>
      <div className="text-[11px] mb-4 max-w-md">
        Pick a template by dimensionality (2D / 3D) and map generation
        (static or dynamic). Static lets you place boxes directly.
        Dynamic lets you author fixed-size section parts that connect via
        sockets, ready to feed a generator.
      </div>
      <button className="primary" style={{ padding: '0.45rem 0.9rem' }} onClick={onCreateRequest}>
        + New Level
      </button>
    </div>
  );
}
