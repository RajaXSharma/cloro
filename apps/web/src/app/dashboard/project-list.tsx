'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { Project } from '@/lib/api/projects';
import { NewProjectForm } from './new-project-form';
import { ProjectCard } from './project-card';

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

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <NewProjectForm />
      {projects.length === 0 ? (
        <p className="text-sm text-gray-500">No projects yet — create your first one above.</p>
      ) : (
        <ul className="space-y-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onDeleted={refresh} />
          ))}
        </ul>
      )}
    </div>
  );
}
