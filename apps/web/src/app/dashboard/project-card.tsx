'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import type { Project } from '@/lib/api/projects';

export function ProjectCard({ project, onDeleted }: { project: Project; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Delete "${project.name}" and its ${project.file_count} file(s)? This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    const res = await api(`/projects/${project.id}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) onDeleted();
  }

  return (
    <li className="flex items-center justify-between rounded border px-4 py-3">
      <a href={`/project/${project.id}`} className="min-w-0">
        <p className="truncate font-medium">{project.name}</p>
        <p className="text-xs text-gray-500">
          {project.file_count} file{project.file_count === 1 ? '' : 's'} · updated{' '}
          {new Date(project.updated_at ?? project.created_at).toLocaleString()}
        </p>
      </a>
      {project.is_owner && (
        <button
          onClick={handleDelete}
          disabled={busy}
          className="ml-4 shrink-0 rounded border border-red-200 px-3 py-1 text-xs text-red-600 disabled:opacity-50"
        >
          Delete
        </button>
      )}
    </li>
  );
}
