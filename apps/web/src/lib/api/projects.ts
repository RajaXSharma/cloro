import { zipFilename } from 'shared';
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


// the backend's `{ error }` string is the whole message the UI shows
async function errorOf(res: Response): Promise<Error> {
  const body = await res.json().catch(() => null);
  return new Error((body as { error?: string } | null)?.error ?? res.statusText);
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await api(path, init);
  if (!res.ok) throw await errorOf(res);
  return res.status === 204 ? (undefined as T) : res.json();
}

const body = (method: string, value: unknown): RequestInit => ({
  method,
  body: JSON.stringify(value),
});

/**
 * Saves the project as a zip. Blob + object URL rather than an `<a href>`: the
 * backend authenticates with a Bearer header, which a plain link cannot send, and
 * the archive is small enough to buffer in the tab.
 */
export async function downloadProject(pid: string, projectName: string): Promise<void> {
  const res = await api(`/projects/${pid}/export`);
  if (!res.ok) throw await errorOf(res);

  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFilename(projectName);
  // the anchor has to be in the document: Safari ignores a click on a detached node.
  // the URL is revoked a tick later — click() starts the navigation, and revoking
  // before this function returns is the one way to cancel it underneath the browser.
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

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
