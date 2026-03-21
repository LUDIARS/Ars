import { create } from 'zustand';
import type {
  ProjectSettings,
  SaveMethod,
  ProjectMember,
  GoogleDriveConfig,
  ResourceDepotConnection,
} from '@/types/settings';
import { DEFAULT_SETTINGS, SETTING_KEYS } from '@/types/settings';
import * as settingsApi from '@/lib/settings-api';

interface SettingsState {
  projectId: string | null;
  settings: ProjectSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

interface SettingsActions {
  loadSettings: (projectId: string) => Promise<void>;
  saveAllSettings: () => Promise<void>;
  setSaveMethod: (method: SaveMethod) => void;
  setMembers: (members: ProjectMember[]) => void;
  addMember: (member: ProjectMember) => void;
  removeMember: (userId: string) => void;
  setGoogleDrive: (config: GoogleDriveConfig) => void;
  setResourceDepot: (config: ResourceDepotConnection) => void;
  reset: () => void;
}

function parseSettingValue<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const useSettingsStore = create<SettingsState & SettingsActions>()((set, get) => ({
  projectId: null,
  settings: { ...DEFAULT_SETTINGS },
  loading: false,
  saving: false,
  error: null,

  loadSettings: async (projectId: string) => {
    set({ projectId, loading: true, error: null });
    try {
      const raw = await settingsApi.getAllSettings(projectId);
      const settings: ProjectSettings = {
        saveMethod: parseSettingValue<SaveMethod>(raw[SETTING_KEYS.SAVE_METHOD], DEFAULT_SETTINGS.saveMethod),
        members: parseSettingValue<ProjectMember[]>(raw[SETTING_KEYS.MEMBERS], DEFAULT_SETTINGS.members),
        googleDrive: parseSettingValue<GoogleDriveConfig>(raw[SETTING_KEYS.GOOGLE_DRIVE], DEFAULT_SETTINGS.googleDrive),
        resourceDepot: parseSettingValue<ResourceDepotConnection>(raw[SETTING_KEYS.RESOURCE_DEPOT], DEFAULT_SETTINGS.resourceDepot),
      };
      set({ settings, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to load settings' });
    }
  },

  saveAllSettings: async () => {
    const { projectId, settings } = get();
    if (!projectId) return;
    set({ saving: true, error: null });
    try {
      const batch: Record<string, string> = {
        [SETTING_KEYS.SAVE_METHOD]: JSON.stringify(settings.saveMethod),
        [SETTING_KEYS.MEMBERS]: JSON.stringify(settings.members),
        [SETTING_KEYS.GOOGLE_DRIVE]: JSON.stringify(settings.googleDrive),
        [SETTING_KEYS.RESOURCE_DEPOT]: JSON.stringify(settings.resourceDepot),
      };
      await settingsApi.putSettingsBatch(projectId, batch);
      set({ saving: false });
    } catch (e) {
      set({ saving: false, error: e instanceof Error ? e.message : 'Failed to save settings' });
    }
  },

  setSaveMethod: (method) =>
    set((s) => ({ settings: { ...s.settings, saveMethod: method } })),

  setMembers: (members) =>
    set((s) => ({ settings: { ...s.settings, members } })),

  addMember: (member) =>
    set((s) => ({
      settings: {
        ...s.settings,
        members: [...s.settings.members.filter((m) => m.userId !== member.userId), member],
      },
    })),

  removeMember: (userId) =>
    set((s) => ({
      settings: {
        ...s.settings,
        members: s.settings.members.filter((m) => m.userId !== userId),
      },
    })),

  setGoogleDrive: (config) =>
    set((s) => ({ settings: { ...s.settings, googleDrive: config } })),

  setResourceDepot: (config) =>
    set((s) => ({ settings: { ...s.settings, resourceDepot: config } })),

  reset: () => set({ projectId: null, settings: { ...DEFAULT_SETTINGS }, error: null }),
}));
