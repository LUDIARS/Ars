export interface User {
  id: string;
  githubId: number;
  login: string;
  displayName: string;
  avatarUrl: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
}
