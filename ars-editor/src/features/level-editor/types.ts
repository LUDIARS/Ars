// Level editor types — TS-only (not yet mirrored in ars-core).
// Templates: 2D vs 3D × static vs dynamic.

export type Dimensionality = '2d' | '3d';
export type Generation = 'static' | 'dynamic';

export type LevelMode = '2d-static' | '3d-static' | '2d-dynamic' | '3d-dynamic';

export function modeOf(dim: Dimensionality, gen: Generation): LevelMode {
  return `${dim}-${gen}` as LevelMode;
}

export function splitMode(mode: LevelMode): { dim: Dimensionality; gen: Generation } {
  const [dim, gen] = mode.split('-') as [Dimensionality, Generation];
  return { dim, gen };
}

// ── Static placement ─────────────────────────────────────

export interface PlacedObject2D {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  tag?: string;
}

export interface PlacedObject3D {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  tag?: string;
}

// ── Dynamic generation: fixed-size section parts with sockets ─

export type SocketDir2D = 'north' | 'south' | 'east' | 'west';
export type SocketDir3D = SocketDir2D | 'up' | 'down';

// Socket type is a free-form string (e.g. "door", "open", "wall").
// Two parts may connect on opposing faces only when their socket types match.
export type Socket = string | null;

export interface SectionPart2D {
  id: string;
  name: string;
  // Sockets per edge (null = no connection allowed).
  sockets: Record<SocketDir2D, Socket>;
  weight: number;
  color: string;
  // Optional inner objects (relative to the fixed section bounds).
  inner: PlacedObject2D[];
}

export interface SectionPart3D {
  id: string;
  name: string;
  sockets: Record<SocketDir3D, Socket>;
  weight: number;
  color: string;
  inner: PlacedObject3D[];
}

// ── Level container ──────────────────────────────────────

export interface GenerationConfig {
  seed: number;
  targetCount: number;
  // 'strict'     — opposing sockets must be identical (and non-null)
  // 'compatible' — opposing sockets must be both non-null
  matchingRule: 'strict' | 'compatible';
}

export interface Level {
  id: string;
  name: string;
  mode: LevelMode;
  // Static: world bounds.
  worldSize: { width: number; height: number; depth: number };
  // Dynamic: fixed bounds enforced for every section.
  sectionSize: { width: number; height: number; depth: number };
  objects2d: PlacedObject2D[];
  objects3d: PlacedObject3D[];
  sections2d: SectionPart2D[];
  sections3d: SectionPart3D[];
  generation: GenerationConfig;
}

// ── Defaults / helpers ───────────────────────────────────

const DEFAULT_PALETTE = [
  '#5b8def',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#a855f7',
  '#06b6d4',
  '#facc15',
  '#ec4899',
];

export function pickColor(index: number): string {
  return DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
}

export function createDefaultLevel(id: string, name: string, mode: LevelMode): Level {
  return {
    id,
    name,
    mode,
    worldSize: { width: 1024, height: 768, depth: 512 },
    sectionSize: { width: 128, height: 128, depth: 128 },
    objects2d: [],
    objects3d: [],
    sections2d: [],
    sections3d: [],
    generation: { seed: 1, targetCount: 16, matchingRule: 'strict' },
  };
}

export function createDefaultSection2D(id: string, name: string, color: string): SectionPart2D {
  return {
    id,
    name,
    sockets: { north: null, south: null, east: null, west: null },
    weight: 1,
    color,
    inner: [],
  };
}

export function createDefaultSection3D(id: string, name: string, color: string): SectionPart3D {
  return {
    id,
    name,
    sockets: { north: null, south: null, east: null, west: null, up: null, down: null },
    weight: 1,
    color,
    inner: [],
  };
}

export const SOCKET_DIRS_2D: SocketDir2D[] = ['north', 'east', 'south', 'west'];
export const SOCKET_DIRS_3D: SocketDir3D[] = ['north', 'east', 'south', 'west', 'up', 'down'];

export const TEMPLATE_LABEL: Record<LevelMode, string> = {
  '2d-static': '2D · Static',
  '3d-static': '3D · Static',
  '2d-dynamic': '2D · Dynamic (parts)',
  '3d-dynamic': '3D · Dynamic (parts)',
};

export const TEMPLATE_DESC: Record<LevelMode, string> = {
  '2d-static':
    'Place rectangles freely in a 2D world. Use for hand-crafted sidescrollers and top-down maps.',
  '3d-static':
    'Place boxes freely in a 3D world (isometric preview). Use for hand-crafted scenes.',
  '2d-dynamic':
    'Define fixed-size 2D section parts with edge sockets. Generation pipeline tiles them by socket compatibility.',
  '3d-dynamic':
    'Define fixed-size 3D section parts with face sockets (incl. up/down). Generation pipeline stacks them by socket compatibility.',
};
