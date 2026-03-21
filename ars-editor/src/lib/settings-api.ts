/// プロジェクト設定API クライアント

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

export async function getAllSettings(projectId: string): Promise<Record<string, string>> {
  return fetchJson<Record<string, string>>(
    `/api/settings/${encodeURIComponent(projectId)}`,
  );
}

export async function getSetting(projectId: string, key: string): Promise<string | null> {
  return fetchJson<string | null>(
    `/api/settings/${encodeURIComponent(projectId)}/${encodeURIComponent(key)}`,
  );
}

export async function putSetting(projectId: string, key: string, value: string): Promise<void> {
  await fetchJson(`/api/settings/${encodeURIComponent(projectId)}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

export async function putSettingsBatch(
  projectId: string,
  settings: Record<string, string>,
): Promise<void> {
  await fetchJson(`/api/settings/${encodeURIComponent(projectId)}/batch`, {
    method: 'POST',
    body: JSON.stringify({ settings }),
  });
}

export async function deleteSetting(projectId: string, key: string): Promise<void> {
  await fetchJson(`/api/settings/${encodeURIComponent(projectId)}/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });
}
