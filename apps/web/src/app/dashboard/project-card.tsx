'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Project } from '@/lib/api/projects';

export function ProjectCard({ project, onDeleted }: { project: Project; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    setBusy(true);
    const res = await api(`/projects/${project.id}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) {
      setConfirming(false);
      onDeleted();
    }
  }

  return (
    <li className="group relative flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50 focus-within:bg-muted/50">
      <Link
        href={`/project/${project.id}`}
        aria-label={`Open ${project.name}`}
        className="absolute inset-0 z-0"
      />
      <div className="pointer-events-none z-10 min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{project.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="meta">
            {project.file_count} file{project.file_count === 1 ? '' : 's'}
          </span>
          <span className="meta">
            updated {new Date(project.updated_at ?? project.created_at).toLocaleString()}
          </span>
        </div>
      </div>
      {project.is_owner && (
        <button
          onClick={() => setConfirming(true)}
          disabled={busy}
          aria-label={`Delete ${project.name}`}
          title="Delete project"
          className="relative z-10 shrink-0 rounded-md p-1.5 text-destructive transition-opacity hover:bg-destructive/10 focus-visible:opacity-100 disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      )}

      <ConfirmDialog
        open={confirming}
        title={`Delete "${project.name}"?`}
        description={`This removes the project and its ${project.file_count} file${
          project.file_count === 1 ? '' : 's'
        } for everyone. This cannot be undone.`}
        confirmLabel="Delete project"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => !busy && setConfirming(false)}
      />
    </li>
  );
}
