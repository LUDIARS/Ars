import { create } from 'zustand';
import type { User, ProjectSummary } from '@/types/auth';
import * as authApi from '@/lib/auth-api';

interface AuthState {
  user: User | null;
  loading: boolean;
  cloudProjects: ProjectSummary[];
  cloudProjectsLoading: boolean;
}

interface AuthActions {
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  fetchCloudProjects: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  user: null,
  loading: true,
  cloudProjects: [],
  cloudProjectsLoading: false,

  fetchUser: async () => {
    set({ loading: true });
    try {
      const user = await authApi.getMe();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    set({ user: null });
  },

  fetchCloudProjects: async () => {
    set({ cloudProjectsLoading: true });
    try {
      const projects = await authApi.listCloudProjects();
      set({ cloudProjects: projects, cloudProjectsLoading: false });
    } catch {
      set({ cloudProjectsLoading: false });
    }
  },
}));
