import type { User, ProjectSummary } from '@/types/auth';
import type { Project } from '@/types/domain';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export async function getMe(): Promise<User> {
  return fetchJson<User>('/auth/me');
}

export async function logout(): Promise<void> {
  await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
}

export function getLoginUrl(): string {
  return '/auth/github/login';
}

export async function saveCloudProject(projectId: string, project: Project): Promise<void> {
  await fetchJson('/api/cloud/project/save', {
    method: 'POST',
    body: JSON.stringify({ projectId, project }),
  });
}

export async function loadCloudProject(projectId: string): Promise<Project> {
  return fetchJson<Project>(`/api/cloud/project/load?projectId=${encodeURIComponent(projectId)}`);
}

export async function listCloudProjects(): Promise<ProjectSummary[]> {
  return fetchJson<ProjectSummary[]>('/api/cloud/project/list');
}

export async function deleteCloudProject(projectId: string): Promise<void> {
  await fetchJson(`/api/cloud/project/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  });
}
