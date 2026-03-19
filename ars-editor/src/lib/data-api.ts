/** Data Organizer API (閲覧 + 調整) */

export interface FieldDefinition {
  name: string;
  field_type: { type: string; [key: string]: unknown };
  default_value?: unknown;
  visibility: 'Exposed' | 'Hidden';
  description: string;
  update_frequency: 'Constant' | 'Rare' | 'Frequent';
}

export interface DataSchema {
  id: string;
  name: string;
  domain: string;
  fields: FieldDefinition[];
  description: string;
}

export interface MasterDataEntry {
  id: string;
  schema_id: string;
  actor_id?: string;
  values: Record<string, unknown>;
}

export interface UserVariable {
  name: string;
  var_type: string;
  value: unknown;
  persistence: 'Persistent' | 'Transient';
  actor_id?: string;
  description: string;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const dataApi = {
  // スキーマ
  getSchemas: () => fetchJson<DataSchema[]>('/api/data/schemas'),
  getSchema: (id: string) => fetchJson<DataSchema>(`/api/data/schemas/${id}`),
  createSchema: (schema: DataSchema) =>
    fetchJson<DataSchema>('/api/data/schemas', {
      method: 'POST',
      body: JSON.stringify(schema),
    }),

  // エントリ
  getEntries: (schemaId: string) =>
    fetchJson<MasterDataEntry[]>(`/api/data/schemas/${schemaId}/entries`),
  getEntry: (schemaId: string, entryId: string) =>
    fetchJson<MasterDataEntry>(`/api/data/schemas/${schemaId}/entries/${entryId}`),
  createEntry: (schemaId: string, entryId: string, actorId?: string) =>
    fetchJson<MasterDataEntry>(`/api/data/schemas/${schemaId}/entries`, {
      method: 'POST',
      body: JSON.stringify({ entry_id: entryId, actor_id: actorId }),
    }),
  updateField: (schemaId: string, entryId: string, field: string, value: unknown) =>
    fetchJson<MasterDataEntry>(`/api/data/schemas/${schemaId}/entries/${entryId}`, {
      method: 'POST',
      body: JSON.stringify({ field, value }),
    }),

  // ユーザーデータ
  getVariables: () => fetchJson<UserVariable[]>('/api/data/variables'),
  getVariablesByActor: (actorId: string) =>
    fetchJson<UserVariable[]>(`/api/data/variables/by-actor?actor_id=${encodeURIComponent(actorId)}`),
  registerVariable: (v: UserVariable) =>
    fetchJson<UserVariable>('/api/data/variables', {
      method: 'POST',
      body: JSON.stringify(v),
    }),
  setVariable: (name: string, value: unknown, actorId?: string) =>
    fetchJson<void>('/api/data/variables/update', {
      method: 'POST',
      body: JSON.stringify({ name, value, actor_id: actorId }),
    }),

  // エクスポート / インポート
  exportAll: () => fetchJson<unknown>('/api/data/export'),
  importAll: (data: unknown) =>
    fetchJson<void>('/api/data/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
