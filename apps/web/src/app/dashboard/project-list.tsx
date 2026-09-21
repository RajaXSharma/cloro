'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { Project } from '@/lib/api/projects';
import { NewProjectForm } from './new-project-form';
import { ProjectCard } from './project-card';

/** Three rows shaped like a project row, so the swap in does not shift the layout. */
function Skeleton() {
  return (
    <div className="divide-y overflow-hidden rounded-lg border">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="h-3.5 w-40 animate-pulse rounded-sm bg-muted" />
            <div className="mt-2 h-3 w-56 animate-pulse rounded-sm bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await api('/projects');
    if (res.ok) setProjects(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6">
      <NewProjectForm />

      {loading ? (
        <Skeleton />
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium">No projects yet</p>
          <p className="mx-auto mt-1 max-w-[46ch] text-sm text-muted-foreground">
            Create your first one above. Files are added inside the project.
          </p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onDeleted={refresh} />
          ))}
        </ul>
      )}
    </div>
  );
}
