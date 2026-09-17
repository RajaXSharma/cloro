'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
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
    <li className="group relative flex items-center justify-between rounded border px-4 py-3 hover:bg-gray-50">
      <a
        href={`/project/${project.id}`}
        aria-label={`Open ${project.name}`}
        className="absolute inset-0 rounded"
      />
      <div className="pointer-events-none min-w-0">
        <p className="truncate font-medium">{project.name}</p>
        <p className="text-xs text-gray-500">
          {project.file_count} file{project.file_count === 1 ? '' : 's'} · updated{' '}
          {new Date(project.updated_at ?? project.created_at).toLocaleString()}
        </p>
      </div>
      {project.is_owner && (
        <button
          onClick={handleDelete}
          disabled={busy}
          aria-label={`Delete ${project.name}`}
          title="Delete project"
          className="relative z-10 ml-4 shrink-0 rounded p-1.5 text-red-600 opacity-0 hover:bg-white focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </li>
  );
}
