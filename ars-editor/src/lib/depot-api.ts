/** Resource Depot API (読み取り専用) */

export type ResourceCategory = 'font' | 'model' | 'texture' | 'motion' | 'sound';

export interface Resource {
  id: string;
  filename: string;
  original_filename: string;
  role: string;
  category: ResourceCategory;
  size: number;
  hash: string;
  local_path?: string;
  status: string;
  metadata: Record<string, unknown>;
}

export interface BonePattern {
  id: string;
  name: string;
  required_bones: string[];
  optional_bones: string[];
}

export interface MotionGroup {
  id: string;
  name: string;
  motion_ids: string[];
  bone_pattern_id?: string;
}

export interface TextureGroup {
  id: string;
  name: string;
  texture_ids: string[];
  atlas_config: { max_width: number; max_height: number; padding: number };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const depotApi = {
  getResources: () => fetchJson<Resource[]>('/api/depot/resources'),
  searchResources: (q: string) => fetchJson<Resource[]>(`/api/depot/resources/search?q=${encodeURIComponent(q)}`),
  getByCategory: (cat: ResourceCategory) => fetchJson<Resource[]>(`/api/depot/resources/by-category?category=${cat}`),
  getResource: (id: string) => fetchJson<Resource>(`/api/depot/resources/${id}`),
  getBonePatterns: () => fetchJson<BonePattern[]>('/api/depot/bone-patterns'),
  getMotionGroups: () => fetchJson<MotionGroup[]>('/api/depot/motion-groups'),
  getTextureGroups: () => fetchJson<TextureGroup[]>('/api/depot/texture-groups'),
  getDuplicates: () => fetchJson<Record<string, string[]>>('/api/depot/duplicates'),
};
