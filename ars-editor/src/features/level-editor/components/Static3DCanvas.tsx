import { useState } from 'react';
import { useLevelStore } from '../levelStore';
import { pickColor, type Level, type PlacedObject3D } from '../types';

interface Props {
  level: Level;
}

// Isometric projection helpers.
// World-space (x, y, z) → screen-space (sx, sy).
// y is "up", z goes "into" the scene.
const ISO_X = { dx: 0.866, dy: 0.5 }; // cos(30), sin(30)
const ISO_Z = { dx: -0.866, dy: 0.5 };

function project(x: number, y: number, z: number) {
  return {
    sx: x * ISO_X.dx + z * ISO_Z.dx,
    sy: -y + x * ISO_X.dy + z * ISO_Z.dy,
  };
}

interface BoxFace {
  d: string;
  fill: string;
  stroke: string;
}

function boxFaces(o: PlacedObject3D, selected: boolean): BoxFace[] {
  const c = o.color;
  // Eight corners.
  const corners = [
    project(o.x, o.y, o.z),
    project(o.x + o.w, o.y, o.z),
    project(o.x + o.w, o.y, o.z + o.d),
    project(o.x, o.y, o.z + o.d),
    project(o.x, o.y + o.h, o.z),
    project(o.x + o.w, o.y + o.h, o.z),
    project(o.x + o.w, o.y + o.h, o.z + o.d),
    project(o.x, o.y + o.h, o.z + o.d),
  ];
  const path = (idxs: number[]) =>
    idxs.map((i, n) => `${n === 0 ? 'M' : 'L'}${corners[i].sx},${corners[i].sy}`).join(' ') + ' Z';
  const stroke = selected ? '#ffffff' : 'rgba(0,0,0,0.5)';
  return [
    // Top (lightest)
    { d: path([4, 5, 6, 7]), fill: shade(c, 1.15), stroke },
    // Right side
    { d: path([1, 2, 6, 5]), fill: shade(c, 0.85), stroke },
    // Front side
    { d: path([0, 1, 5, 4]), fill: shade(c, 1.0), stroke },
  ];
}

function shade(hex: string, factor: number): string {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  let r = (v >> 16) & 255;
  let g = (v >> 8) & 255;
  let b = v & 255;
  r = Math.max(0, Math.min(255, Math.round(r * factor)));
  g = Math.max(0, Math.min(255, Math.round(g * factor)));
  b = Math.max(0, Math.min(255, Math.round(b * factor)));
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

interface AddDraft {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

const DEFAULT_DRAFT: AddDraft = { x: 0, y: 0, z: 0, w: 64, h: 64, d: 64 };

export function Static3DCanvas({ level }: Props) {
  const activeLevelId = useLevelStore((s) => s.activeLevelId);
  const selectedObjectId = useLevelStore((s) => s.selectedObjectId);
  const selectObject = useLevelStore((s) => s.selectObject);
  const addObject = useLevelStore((s) => s.addObject3D);
  const deleteObject = useLevelStore((s) => s.deleteObject3D);

  const [draft, setDraft] = useState<AddDraft>(DEFAULT_DRAFT);

  const W = level.worldSize.width;
  const H = level.worldSize.height;
  const D = level.worldSize.depth;

  // Sort objects back-to-front for painter's algorithm (rough depth = x + z + y)
  const sorted = [...level.objects3d].sort((a, b) => a.x + a.z + a.y - (b.x + b.z + b.y));

  // Compute viewBox to fit world bounds
  const corners = [
    project(0, 0, 0),
    project(W, 0, 0),
    project(W, 0, D),
    project(0, 0, D),
    project(0, H, 0),
    project(W, H, 0),
    project(W, H, D),
    project(0, H, D),
  ];
  const minX = Math.min(...corners.map((c) => c.sx)) - 30;
  const maxX = Math.max(...corners.map((c) => c.sx)) + 30;
  const minY = Math.min(...corners.map((c) => c.sy)) - 30;
  const maxY = Math.max(...corners.map((c) => c.sy)) + 30;
  const vbW = maxX - minX;
  const vbH = maxY - minY;

  // Floor as a quad.
  const floor = [project(0, 0, 0), project(W, 0, 0), project(W, 0, D), project(0, 0, D)];
  const floorPath =
    floor.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.sx},${p.sy}`).join(' ') + ' Z';

  const handleAdd = () => {
    if (!activeLevelId) return;
    const o: Omit<PlacedObject3D, 'id'> = {
      name: `Box ${level.objects3d.length + 1}`,
      x: clamp(draft.x, 0, Math.max(0, W - draft.w)),
      y: clamp(draft.y, 0, Math.max(0, H - draft.h)),
      z: clamp(draft.z, 0, Math.max(0, D - draft.d)),
      w: Math.max(1, draft.w),
      h: Math.max(1, draft.h),
      d: Math.max(1, draft.d),
      color: pickColor(level.objects3d.length),
    };
    addObject(activeLevelId, o);
  };

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-3 py-1.5 text-[11px] flex items-center gap-2 flex-wrap"
        style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        <span>
          World: {W} × {H} × {D}
        </span>
        <span>·</span>
        <span>Click a box to select.</span>
      </div>

      {/* Add controls */}
      <div
        className="px-3 py-2 flex items-end gap-2 flex-wrap"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {(['x', 'y', 'z', 'w', 'h', 'd'] as const).map((k) => (
          <label key={k} className="text-[10px] flex flex-col" style={{ color: 'var(--text-muted)' }}>
            <span className="uppercase">{k}</span>
            <input
              type="number"
              value={draft[k]}
              className="w-14 px-1 py-0.5 text-xs rounded"
              onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })}
            />
          </label>
        ))}
        <button className="primary text-xs" style={{ padding: '0.3rem 0.6rem' }} onClick={handleAdd}>
          + Box
        </button>
        {selectedObjectId && (
          <button
            className="ml-auto text-[11px]"
            style={{ color: 'var(--red, #ef4444)' }}
            onClick={() => activeLevelId && deleteObject(activeLevelId, selectedObjectId)}
          >
            Delete selected
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto" style={{ background: '#0f1419' }}>
        <svg
          viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
          preserveAspectRatio="xMidYMid meet"
          width="100%"
          height="100%"
          style={{ display: 'block' }}
          onMouseDown={(e) => {
            if ((e.target as SVGElement).id === 'floor') selectObject(null);
          }}
        >
          {/* Floor grid */}
          <path id="floor" d={floorPath} fill="#1a2330" stroke="#1f2937" />
          {/* Floor grid lines along X and Z */}
          <g stroke="#243246" strokeWidth={1}>
            {Array.from({ length: Math.floor(W / 64) + 1 }, (_, i) => {
              const a = project(i * 64, 0, 0);
              const b = project(i * 64, 0, D);
              return <line key={`gx-${i}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} />;
            })}
            {Array.from({ length: Math.floor(D / 64) + 1 }, (_, i) => {
              const a = project(0, 0, i * 64);
              const b = project(W, 0, i * 64);
              return <line key={`gz-${i}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} />;
            })}
          </g>
          {/* Boxes */}
          {sorted.map((o) => {
            const sel = o.id === selectedObjectId;
            const faces = boxFaces(o, sel);
            const top = project(o.x, o.y + o.h, o.z);
            return (
              <g
                key={o.id}
                style={{ cursor: 'pointer' }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  selectObject(o.id);
                }}
              >
                {faces.map((f, i) => (
                  <path
                    key={i}
                    d={f.d}
                    fill={f.fill}
                    stroke={f.stroke}
                    strokeWidth={sel ? 1.5 : 0.75}
                  />
                ))}
                <text
                  x={top.sx + 4}
                  y={top.sy - 4}
                  fontSize={10}
                  fill="#fff"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {o.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
