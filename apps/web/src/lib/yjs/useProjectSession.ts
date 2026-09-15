'use client';

import { useCallback, useEffect, useState } from 'react';
import { getProject, listFiles, type Project, type ProjectFile } from '@/lib/api/projects';


export function useProjectSession(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setFiles(await listFiles(projectId));
  }, [projectId]);

  useEffect(() => {
    let alive = true;
    Promise.all([getProject(projectId), listFiles(projectId)])
      .then(([p, f]) => {
        if (!alive) return;
        setProject(p);
        setFiles(f);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'failed'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [projectId]);

  return { project, files, loading, error, refresh };
}
