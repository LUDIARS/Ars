import { useRef, useState } from 'react';
import { useLevelStore } from '../levelStore';
import { pickColor, type Level, type PlacedObject2D } from '../types';

interface Props {
  level: Level;
  // If provided, render objects from this list instead of level.objects2d.
  // Used by the section editor to reuse the canvas for in-section content.
  inner?: PlacedObject2D[];
  onAdd?: (obj: Omit<PlacedObject2D, 'id'>) => void;
  onUpdate?: (id: string, patch: Partial<PlacedObject2D>) => void;
  onDelete?: (id: string) => void;
  // Override world bounds (used by section editor: bounds are fixed section size).
  width?: number;
  height?: number;
  fixedBounds?: boolean;
}

export function Static2DCanvas(props: Props) {
  const { level } = props;
  const activeLevelId = useLevelStore((s) => s.activeLevelId);
  const selectedObjectId = useLevelStore((s) => s.selectedObjectId);
  const selectObject = useLevelStore((s) => s.selectObject);
  const storeAdd = useLevelStore((s) => s.addObject2D);
  const storeUpdate = useLevelStore((s) => s.updateObject2D);
  const storeDelete = useLevelStore((s) => s.deleteObject2D);

  const objects = props.inner ?? level.objects2d;
  const W = props.width ?? level.worldSize.width;
  const H = props.height ?? level.worldSize.height;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<
    | null
    | {
        kind: 'create';
        startX: number;
        startY: number;
        x: number;
        y: number;
      }
    | {
        kind: 'move';
        objectId: string;
        startX: number;
        startY: number;
        origX: number;
        origY: number;
      }
  >(null);

  const addObject = (obj: Omit<PlacedObject2D, 'id'>) => {
    if (props.onAdd) props.onAdd(obj);
    else if (activeLevelId) storeAdd(activeLevelId, obj);
  };
  const updateObject = (id: string, patch: Partial<PlacedObject2D>) => {
    if (props.onUpdate) props.onUpdate(id, patch);
    else if (activeLevelId) storeUpdate(activeLevelId, id, patch);
  };
  const deleteObject = (id: string) => {
    if (props.onDelete) props.onDelete(id);
    else if (activeLevelId) storeDelete(activeLevelId, id);
  };

  const toLocal = (e: React.MouseEvent): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const sx = W / rect.width;
    const sy = H / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const onSvgMouseDown = (e: React.MouseEvent) => {
    if (e.target !== svgRef.current && (e.target as Element).tagName !== 'rect') {
      // background only
    }
    if (e.target === svgRef.current || (e.target as SVGElement).id === 'bg') {
      const { x, y } = toLocal(e);
      setDrag({ kind: 'create', startX: x, startY: y, x, y });
      selectObject(null);
    }
  };

  const onSvgMouseMove = (e: React.MouseEvent) => {
    if (!drag) return;
    const { x, y } = toLocal(e);
    if (drag.kind === 'create') {
      setDrag({ ...drag, x, y });
    } else if (drag.kind === 'move') {
      const dx = x - drag.startX;
      const dy = y - drag.startY;
      let nx = drag.origX + dx;
      let ny = drag.origY + dy;
      const obj = objects.find((o) => o.id === drag.objectId);
      if (props.fixedBounds && obj) {
        nx = Math.max(0, Math.min(W - obj.w, nx));
        ny = Math.max(0, Math.min(H - obj.h, ny));
      }
      updateObject(drag.objectId, { x: nx, y: ny });
    }
  };

  const onSvgMouseUp = () => {
    if (drag?.kind === 'create') {
      const x = Math.min(drag.startX, drag.x);
      const y = Math.min(drag.startY, drag.y);
      const w = Math.abs(drag.x - drag.startX);
      const h = Math.abs(drag.y - drag.startY);
      if (w > 4 && h > 4) {
        addObject({
          name: `Box ${objects.length + 1}`,
          x: Math.round(x),
          y: Math.round(y),
          w: Math.round(w),
          h: Math.round(h),
          color: pickColor(objects.length),
        });
      }
    }
    setDrag(null);
  };

  const startMove = (e: React.MouseEvent, obj: PlacedObject2D) => {
    e.stopPropagation();
    selectObject(obj.id);
    const { x, y } = toLocal(e);
    setDrag({
      kind: 'move',
      objectId: obj.id,
      startX: x,
      startY: y,
      origX: obj.x,
      origY: obj.y,
    });
  };

  const previewRect = drag?.kind === 'create'
    ? {
        x: Math.min(drag.startX, drag.x),
        y: Math.min(drag.startY, drag.y),
        w: Math.abs(drag.x - drag.startX),
        h: Math.abs(drag.y - drag.startY),
      }
    : null;

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-3 py-1.5 text-[11px] flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        <span>
          World: {W} × {H}
        </span>
        <span>·</span>
        <span>Drag on background to draw a box. Click a box to select.</span>
        {selectedObjectId && (
          <button
            className="ml-auto"
            style={{ color: 'var(--red, #ef4444)', fontSize: 11 }}
            onClick={() => selectedObjectId && deleteObject(selectedObjectId)}
          >
            Delete selected
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto" style={{ background: 'var(--bg)' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          width="100%"
          height="100%"
          style={{ display: 'block', cursor: drag?.kind === 'create' ? 'crosshair' : 'default' }}
          onMouseDown={onSvgMouseDown}
          onMouseMove={onSvgMouseMove}
          onMouseUp={onSvgMouseUp}
          onMouseLeave={onSvgMouseUp}
        >
          {/* background */}
          <rect id="bg" x={0} y={0} width={W} height={H} fill="#0f1419" />
          {/* grid */}
          <g stroke="#1f2937" strokeWidth={1}>
            {Array.from({ length: Math.floor(W / 64) + 1 }, (_, i) => (
              <line key={`vx-${i}`} x1={i * 64} y1={0} x2={i * 64} y2={H} />
            ))}
            {Array.from({ length: Math.floor(H / 64) + 1 }, (_, i) => (
              <line key={`hx-${i}`} x1={0} y1={i * 64} x2={W} y2={i * 64} />
            ))}
          </g>
          {/* objects */}
          {objects.map((o) => {
            const sel = o.id === selectedObjectId;
            return (
              <g key={o.id} onMouseDown={(e) => startMove(e, o)} style={{ cursor: 'move' }}>
                <rect
                  x={o.x}
                  y={o.y}
                  width={o.w}
                  height={o.h}
                  fill={o.color}
                  fillOpacity={0.55}
                  stroke={sel ? '#fff' : o.color}
                  strokeWidth={sel ? 2 : 1}
                />
                <text
                  x={o.x + 4}
                  y={o.y + 14}
                  fontSize={12}
                  fill="#fff"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {o.name}
                </text>
              </g>
            );
          })}
          {/* preview */}
          {previewRect && previewRect.w > 1 && previewRect.h > 1 && (
            <rect
              x={previewRect.x}
              y={previewRect.y}
              width={previewRect.w}
              height={previewRect.h}
              fill="rgba(88,166,255,0.2)"
              stroke="#58a6ff"
              strokeDasharray="4 4"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
