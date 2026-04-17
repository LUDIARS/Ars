import { useState } from 'react';
import { useLevelStore } from '../levelStore';
import { TEMPLATE_DESC, TEMPLATE_LABEL, modeOf } from '../types';
import type { Dimensionality, Generation, LevelMode } from '../types';

interface Props {
  onClose: () => void;
}

const DIMS: { key: Dimensionality; label: string }[] = [
  { key: '2d', label: '2D' },
  { key: '3d', label: '3D' },
];

const GENS: { key: Generation; label: string }[] = [
  { key: 'static', label: 'Static (hand-placed)' },
  { key: 'dynamic', label: 'Dynamic (parts + sockets)' },
];

export function LevelTemplatePicker({ onClose }: Props) {
  const createLevel = useLevelStore((s) => s.createLevel);
  const [dim, setDim] = useState<Dimensionality>('2d');
  const [gen, setGen] = useState<Generation>('static');
  const [name, setName] = useState('');
  const mode: LevelMode = modeOf(dim, gen);

  const handleCreate = () => {
    const finalName = name.trim() || `Level (${TEMPLATE_LABEL[mode]})`;
    createLevel(finalName, mode);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg p-5 w-[480px] max-w-[92vw]"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text)' }}>
          New Level — pick a template
        </h2>

        {/* Dimensionality */}
        <div className="mb-3">
          <div
            className="text-[10px] uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Dimensionality
          </div>
          <div className="flex gap-2">
            {DIMS.map((d) => (
              <button
                key={d.key}
                onClick={() => setDim(d.key)}
                className="flex-1 px-3 py-2 rounded text-sm"
                style={{
                  background: dim === d.key ? 'rgba(88,166,255,0.15)' : 'transparent',
                  border: '1px solid ' + (dim === d.key ? 'var(--accent)' : 'var(--border)'),
                  color: 'var(--text)',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generation type */}
        <div className="mb-3">
          <div
            className="text-[10px] uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Map generation
          </div>
          <div className="flex gap-2">
            {GENS.map((g) => (
              <button
                key={g.key}
                onClick={() => setGen(g.key)}
                className="flex-1 px-3 py-2 rounded text-sm"
                style={{
                  background: gen === g.key ? 'rgba(88,166,255,0.15)' : 'transparent',
                  border: '1px solid ' + (gen === g.key ? 'var(--accent)' : 'var(--border)'),
                  color: 'var(--text)',
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Template summary */}
        <div
          className="rounded p-2.5 mb-3 text-xs leading-relaxed"
          style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)' }}
        >
          <div className="font-semibold mb-1" style={{ color: 'var(--text)' }}>
            {TEMPLATE_LABEL[mode]}
          </div>
          {TEMPLATE_DESC[mode]}
        </div>

        {/* Name */}
        <div className="mb-4">
          <div
            className="text-[10px] uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Name
          </div>
          <input
            className="w-full text-sm px-2 py-1.5 rounded"
            value={name}
            placeholder={`Level (${TEMPLATE_LABEL[mode]})`}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1.5 text-sm rounded"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="primary" style={{ padding: '0.4rem 0.8rem' }} onClick={handleCreate}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
