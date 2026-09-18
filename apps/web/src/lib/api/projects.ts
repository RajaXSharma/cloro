import { api } from './client';

export type Project = {
  id: string;
  name: string;
  owner_id: string;
  is_owner: boolean;
  file_count: number;
  created_at: string;
  updated_at?: string;
};

export type ProjectFile = {
  id: string;
  path: string;
  language: string;
  updated_at: string;
};


async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await api(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error((body as { error?: string } | null)?.error ?? res.statusText);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const body = (method: string, value: unknown): RequestInit => ({
  method,
  body: JSON.stringify(value),
});

export const getProject = (id: string) => req<Project>(`/projects/${id}`);
export const listFiles = (pid: string) => req<ProjectFile[]>(`/projects/${pid}/files`);

export const createFile = (pid: string, path: string) =>
  req<ProjectFile>(`/projects/${pid}/files`, body('POST', { path }));

export const renameFile = (id: string, path: string) =>
  req<ProjectFile>(`/files/${id}`, body('PATCH', { path }));

export const deleteFile = (id: string) =>
  req<{ deleted: string[] }>(`/files/${id}`, { method: 'DELETE' });

// a folder has no id — it is a path prefix, so delete takes the prefix
export const deleteFolder = (pid: string, path: string) =>
  req<{ deleted: string[] }>(
    `/projects/${pid}/files?path=${encodeURIComponent(path)}`,
    { method: 'DELETE' },
  );

// same handle for rename: old prefix in the query, new prefix in the body.
// the route returns `returning id, path` only, so it is not a full ProjectFile
export const renameFolder = (pid: string, from: string, to: string) =>
  req<Pick<ProjectFile, 'id' | 'path'>[]>(
    `/projects/${pid}/files?path=${encodeURIComponent(from)}`,
    body('PATCH', { path: to }),
  );
