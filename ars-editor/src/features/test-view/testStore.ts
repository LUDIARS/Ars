import { create } from 'zustand';
import { generateId } from '@/lib/utils';
import type {
  FunctionalTest,
  IntegrationTest,
  TestDriver,
  TestModule,
  TestKind,
  TestStatus,
} from './types';
import { DEFAULT_INTEGRATION_SKELETON, DEFAULT_INTEGRATION_DETAILS } from './types';

/**
 * テストビューの Zustand ストア。
 *
 * 実際のファイル I/O（`test/` ディレクトリ同期）や AI 骨子生成はバックエンド側で行い、
 * このストアは UI 上の状態・ユーザ操作を保持する。
 */
interface TestState {
  // ── Active selection ─────────────────────────────
  /** 左ペインでのカテゴリ選択 */
  activeKind: TestKind;
  /** 詳細ペインに表示している個別テスト ID */
  selectedTestId: string | null;

  // ── Collections ──────────────────────────────────
  functionalTests: Record<string, FunctionalTest>;
  integrationTests: Record<string, IntegrationTest>;
  drivers: Record<string, TestDriver>;
  modules: Record<string, TestModule>;

  // ── Actions: selection ───────────────────────────
  setActiveKind: (kind: TestKind) => void;
  selectTest: (id: string | null) => void;

  // ── Actions: functional ──────────────────────────
  upsertFunctionalTest: (test: FunctionalTest) => void;
  removeFunctionalTest: (id: string) => void;
  createFunctionalTest: (targetPath: string, requirement: string) => string;

  // ── Actions: integration ─────────────────────────
  upsertIntegrationTest: (test: IntegrationTest) => void;
  removeIntegrationTest: (id: string) => void;
  createIntegrationTest: (sceneId: string, name: string) => string;
  /** AI 骨子だけを差し替え、人間記述（details）は保持する。 */
  regenerateSkeleton: (id: string, skeleton: string) => void;
  updateIntegrationDetails: (id: string, details: string) => void;

  // ── Actions: drivers ─────────────────────────────
  upsertDriver: (driver: TestDriver) => void;
  removeDriver: (id: string) => void;

  // ── Actions: modules ─────────────────────────────
  upsertModule: (mod: TestModule) => void;
  removeModule: (id: string) => void;

  // ── Actions: runner ──────────────────────────────
  setStatus: (kind: TestKind, id: string, status: TestStatus, message?: string) => void;
  /** 選択中カテゴリの全テストの status をリセットする。 */
  resetStatuses: () => void;
}

export const useTestStore = create<TestState>()((set) => ({
  activeKind: 'functional',
  selectedTestId: null,

  functionalTests: {},
  integrationTests: {},
  drivers: {},
  modules: {},

  setActiveKind: (kind) => set({ activeKind: kind, selectedTestId: null }),
  selectTest: (id) => set({ selectedTestId: id }),

  // ── functional ──────────────────────────────────
  upsertFunctionalTest: (test) =>
    set((s) => ({
      functionalTests: { ...s.functionalTests, [test.id]: test },
    })),

  removeFunctionalTest: (id) =>
    set((s) => {
      const next = { ...s.functionalTests };
      delete next[id];
      return {
        functionalTests: next,
        selectedTestId: s.selectedTestId === id ? null : s.selectedTestId,
      };
    }),

  createFunctionalTest: (targetPath, requirement) => {
    const id = generateId();
    set((s) => ({
      functionalTests: {
        ...s.functionalTests,
        [id]: {
          id,
          targetPath,
          requirement,
          generated: false,
          driverIds: [],
          moduleIds: [],
          lastStatus: 'pending',
        },
      },
    }));
    return id;
  },

  // ── integration ─────────────────────────────────
  upsertIntegrationTest: (test) =>
    set((s) => ({
      integrationTests: { ...s.integrationTests, [test.id]: test },
    })),

  removeIntegrationTest: (id) =>
    set((s) => {
      const next = { ...s.integrationTests };
      delete next[id];
      return {
        integrationTests: next,
        selectedTestId: s.selectedTestId === id ? null : s.selectedTestId,
      };
    }),

  createIntegrationTest: (sceneId, name) => {
    const id = generateId();
    set((s) => ({
      integrationTests: {
        ...s.integrationTests,
        [id]: {
          id,
          sceneId,
          name,
          skeleton: DEFAULT_INTEGRATION_SKELETON,
          details: DEFAULT_INTEGRATION_DETAILS,
          moduleIds: [],
          lastStatus: 'pending',
        },
      },
    }));
    return id;
  },

  regenerateSkeleton: (id, skeleton) =>
    set((s) => {
      const prev = s.integrationTests[id];
      if (!prev) return {};
      return {
        integrationTests: {
          ...s.integrationTests,
          [id]: { ...prev, skeleton },
        },
      };
    }),

  updateIntegrationDetails: (id, details) =>
    set((s) => {
      const prev = s.integrationTests[id];
      if (!prev) return {};
      return {
        integrationTests: {
          ...s.integrationTests,
          [id]: { ...prev, details },
        },
      };
    }),

  // ── drivers ─────────────────────────────────────
  upsertDriver: (driver) =>
    set((s) => ({ drivers: { ...s.drivers, [driver.id]: driver } })),

  removeDriver: (id) =>
    set((s) => {
      const next = { ...s.drivers };
      delete next[id];
      return { drivers: next };
    }),

  // ── modules ─────────────────────────────────────
  upsertModule: (mod) =>
    set((s) => ({ modules: { ...s.modules, [mod.id]: mod } })),

  removeModule: (id) =>
    set((s) => {
      const next = { ...s.modules };
      delete next[id];
      return { modules: next };
    }),

  // ── runner ──────────────────────────────────────
  setStatus: (kind, id, status, message) =>
    set((s) => {
      if (kind === 'functional') {
        const prev = s.functionalTests[id];
        if (!prev) return {};
        return {
          functionalTests: {
            ...s.functionalTests,
            [id]: { ...prev, lastStatus: status, lastMessage: message },
          },
        };
      } else {
        const prev = s.integrationTests[id];
        if (!prev) return {};
        return {
          integrationTests: {
            ...s.integrationTests,
            [id]: { ...prev, lastStatus: status, lastMessage: message },
          },
        };
      }
    }),

  resetStatuses: () =>
    set((s) => {
      const functionalTests = Object.fromEntries(
        Object.entries(s.functionalTests).map(([id, t]) => [
          id,
          { ...t, lastStatus: 'pending' as TestStatus, lastMessage: undefined },
        ]),
      );
      const integrationTests = Object.fromEntries(
        Object.entries(s.integrationTests).map(([id, t]) => [
          id,
          { ...t, lastStatus: 'pending' as TestStatus, lastMessage: undefined },
        ]),
      );
      return { functionalTests, integrationTests };
    }),
}));
