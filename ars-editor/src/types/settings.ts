/// プロジェクト設定の型定義

export type SaveMethod = 'local' | 'cloud' | 'git';

export interface ProjectMember {
  userId: string;
  login: string;
  displayName: string;
  avatarUrl: string;
  role: 'owner' | 'editor' | 'viewer';
}

export interface GoogleDriveConfig {
  enabled: boolean;
  folderId: string;
  folderName: string;
  syncEnabled: boolean;
}

export interface ResourceDepotConnection {
  url: string;
  label: string;
  enabled: boolean;
}

/** KVSから復元されるプロジェクト設定の全体像 */
export interface ProjectSettings {
  saveMethod: SaveMethod;
  members: ProjectMember[];
  googleDrive: GoogleDriveConfig;
  resourceDepot: ResourceDepotConnection;
}

/** 設定キーとJSON値のマッピング */
export const SETTING_KEYS = {
  SAVE_METHOD: 'saveMethod',
  MEMBERS: 'members',
  GOOGLE_DRIVE: 'googleDrive',
  RESOURCE_DEPOT: 'resourceDepot',
} as const;

export const DEFAULT_SETTINGS: ProjectSettings = {
  saveMethod: 'cloud',
  members: [],
  googleDrive: {
    enabled: false,
    folderId: '',
    folderName: '',
    syncEnabled: false,
  },
  resourceDepot: {
    url: '',
    label: '',
    enabled: false,
  },
};
