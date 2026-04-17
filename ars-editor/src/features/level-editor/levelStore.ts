import { create } from 'zustand';
import { generateId } from '@/lib/utils';
import {
  createDefaultLevel,
  createDefaultSection2D,
  createDefaultSection3D,
  pickColor,
  splitMode,
  type Level,
  type LevelMode,
  type PlacedObject2D,
  type PlacedObject3D,
  type SectionPart2D,
  type SectionPart3D,
  type Socket,
  type SocketDir2D,
  type SocketDir3D,
} from './types';

interface LevelState {
  levels: Record<string, Level>;
  activeLevelId: string | null;
  // Selection inside the active level.
  selectedObjectId: string | null;
  selectedSectionId: string | null;

  // Level CRUD
  createLevel: (name: string, mode: LevelMode) => string;
  deleteLevel: (id: string) => void;
  renameLevel: (id: string, name: string) => void;
  setActiveLevel: (id: string | null) => void;
  updateLevel: (id: string, patch: Partial<Omit<Level, 'id'>>) => void;

  // Static object CRUD
  addObject2D: (levelId: string, obj: Omit<PlacedObject2D, 'id'>) => string;
  updateObject2D: (levelId: string, objectId: string, patch: Partial<PlacedObject2D>) => void;
  deleteObject2D: (levelId: string, objectId: string) => void;

  addObject3D: (levelId: string, obj: Omit<PlacedObject3D, 'id'>) => string;
  updateObject3D: (levelId: string, objectId: string, patch: Partial<PlacedObject3D>) => void;
  deleteObject3D: (levelId: string, objectId: string) => void;

  // Dynamic section CRUD
  addSection2D: (levelId: string, name: string) => string;
  updateSection2D: (levelId: string, sectionId: string, patch: Partial<SectionPart2D>) => void;
  setSocket2D: (levelId: string, sectionId: string, dir: SocketDir2D, socket: Socket) => void;
  deleteSection2D: (levelId: string, sectionId: string) => void;

  addSection3D: (levelId: string, name: string) => string;
  updateSection3D: (levelId: string, sectionId: string, patch: Partial<SectionPart3D>) => void;
  setSocket3D: (levelId: string, sectionId: string, dir: SocketDir3D, socket: Socket) => void;
  deleteSection3D: (levelId: string, sectionId: string) => void;

  // Selection
  selectObject: (id: string | null) => void;
  selectSection: (id: string | null) => void;
}

function patchLevel(
  state: LevelState,
  levelId: string,
  fn: (lvl: Level) => Level,
): Partial<LevelState> {
  const lvl = state.levels[levelId];
  if (!lvl) return {};
  return { levels: { ...state.levels, [levelId]: fn(lvl) } };
}

export const useLevelStore = create<LevelState>()((set, get) => ({
  levels: {},
  activeLevelId: null,
  selectedObjectId: null,
  selectedSectionId: null,

  // ── Level CRUD ────────────────────────────────────

  createLevel: (name, mode) => {
    const id = generateId();
    const lvl = createDefaultLevel(id, name, mode);
    set((s) => ({
      levels: { ...s.levels, [id]: lvl },
      activeLevelId: id,
      selectedObjectId: null,
      selectedSectionId: null,
    }));
    return id;
  },

  deleteLevel: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.levels;
      return {
        levels: rest,
        activeLevelId: s.activeLevelId === id ? null : s.activeLevelId,
      };
    }),

  renameLevel: (id, name) =>
    set((s) => patchLevel(s, id, (lvl) => ({ ...lvl, name }))),

  setActiveLevel: (id) =>
    set({ activeLevelId: id, selectedObjectId: null, selectedSectionId: null }),

  updateLevel: (id, patch) =>
    set((s) => patchLevel(s, id, (lvl) => ({ ...lvl, ...patch, id: lvl.id }))),

  // ── 2D objects ────────────────────────────────────

  addObject2D: (levelId, obj) => {
    const id = generateId();
    set((s) =>
      patchLevel(s, levelId, (lvl) => ({
        ...lvl,
        objects2d: [...lvl.objects2d, { ...obj, id }],
      })),
    );
    set({ selectedObjectId: id });
    return id;
  },

  updateObject2D: (levelId, objectId, patch) =>
    set((s) =>
      patchLevel(s, levelId, (lvl) => ({
        ...lvl,
        objects2d: lvl.objects2d.map((o) => (o.id === objectId ? { ...o, ...patch, id: o.id } : o)),
      })),
    ),

  deleteObject2D: (levelId, objectId) =>
    set((s) => {
      const next = patchLevel(s, levelId, (lvl) => ({
        ...lvl,
        objects2d: lvl.objects2d.filter((o) => o.id !== objectId),
      }));
      return {
        ...next,
        selectedObjectId: s.selectedObjectId === objectId ? null : s.selectedObjectId,
      };
    }),

  // ── 3D objects ────────────────────────────────────

  addObject3D: (levelId, obj) => {
    const id = generateId();
    set((s) =>
      patchLevel(s, levelId, (lvl) => ({
        ...lvl,
        objects3d: [...lvl.objects3d, { ...obj, id }],
      })),
    );
    set({ selectedObjectId: id });
    return id;
  },

  updateObject3D: (levelId, objectId, patch) =>
    set((s) =>
      patchLevel(s, levelId, (lvl) => ({
        ...lvl,
        objects3d: lvl.objects3d.map((o) => (o.id === objectId ? { ...o, ...patch, id: o.id } : o)),
      })),
    ),

  deleteObject3D: (levelId, objectId) =>
    set((s) => {
      const next = patchLevel(s, levelId, (lvl) => ({
        ...lvl,
        objects3d: lvl.objects3d.filter((o) => o.id !== objectId),
      }));
      return {
        ...next,
        selectedObjectId: s.selectedObjectId === objectId ? null : s.selectedObjectId,
      };
    }),

  // ── 2D sections ───────────────────────────────────

  addSection2D: (levelId, name) => {
    const id = generateId();
    const lvl = get().levels[levelId];
    const color = pickColor(lvl ? lvl.sections2d.length : 0);
    set((s) =>
      patchLevel(s, levelId, (curr) => ({
        ...curr,
        sections2d: [...curr.sections2d, createDefaultSection2D(id, name, color)],
      })),
    );
    set({ selectedSectionId: id });
    return id;
  },

  updateSection2D: (levelId, sectionId, patch) =>
    set((s) =>
      patchLevel(s, levelId, (lvl) => ({
        ...lvl,
        sections2d: lvl.sections2d.map((sec) =>
          sec.id === sectionId ? { ...sec, ...patch, id: sec.id } : sec,
        ),
      })),
    ),

  setSocket2D: (levelId, sectionId, dir, socket) =>
    set((s) =>
      patchLevel(s, levelId, (lvl) => ({
        ...lvl,
        sections2d: lvl.sections2d.map((sec) =>
          sec.id === sectionId ? { ...sec, sockets: { ...sec.sockets, [dir]: socket } } : sec,
        ),
      })),
    ),

  deleteSection2D: (levelId, sectionId) =>
    set((s) => {
      const next = patchLevel(s, levelId, (lvl) => ({
        ...lvl,
        sections2d: lvl.sections2d.filter((sec) => sec.id !== sectionId),
      }));
      return {
        ...next,
        selectedSectionId: s.selectedSectionId === sectionId ? null : s.selectedSectionId,
      };
    }),

  // ── 3D sections ───────────────────────────────────

  addSection3D: (levelId, name) => {
    const id = generateId();
    const lvl = get().levels[levelId];
    const color = pickColor(lvl ? lvl.sections3d.length : 0);
    set((s) =>
      patchLevel(s, levelId, (curr) => ({
        ...curr,
        sections3d: [...curr.sections3d, createDefaultSection3D(id, name, color)],
      })),
    );
    set({ selectedSectionId: id });
    return id;
  },

  updateSection3D: (levelId, sectionId, patch) =>
    set((s) =>
      patchLevel(s, levelId, (lvl) => ({
        ...lvl,
        sections3d: lvl.sections3d.map((sec) =>
          sec.id === sectionId ? { ...sec, ...patch, id: sec.id } : sec,
        ),
      })),
    ),

  setSocket3D: (levelId, sectionId, dir, socket) =>
    set((s) =>
      patchLevel(s, levelId, (lvl) => ({
        ...lvl,
        sections3d: lvl.sections3d.map((sec) =>
          sec.id === sectionId ? { ...sec, sockets: { ...sec.sockets, [dir]: socket } } : sec,
        ),
      })),
    ),

  deleteSection3D: (levelId, sectionId) =>
    set((s) => {
      const next = patchLevel(s, levelId, (lvl) => ({
        ...lvl,
        sections3d: lvl.sections3d.filter((sec) => sec.id !== sectionId),
      }));
      return {
        ...next,
        selectedSectionId: s.selectedSectionId === sectionId ? null : s.selectedSectionId,
      };
    }),

  // ── Selection ─────────────────────────────────────

  selectObject: (id) => set({ selectedObjectId: id, selectedSectionId: null }),
  selectSection: (id) => set({ selectedSectionId: id, selectedObjectId: null }),
}));

// Re-export for convenience
export { splitMode };
