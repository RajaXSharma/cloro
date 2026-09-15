'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjectSession } from '@/lib/yjs/useProjectSession';
import { FileTree } from '@/components/files/FileTree';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { project, files, loading, error, refresh } = useProjectSession(id);

  useEffect(() => {
    if (error) router.replace('/dashboard');
  }, [error, router]);

  if (loading || !project) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-2">
        <a href="/dashboard" className="text-xs text-muted-foreground hover:underline">
          ← Projects
        </a>
        <h1 className="text-sm font-medium">{project.name}</h1>
        <span className="text-xs text-muted-foreground">{files.length} files</span>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 overflow-hidden border-r">
          <FileTree projectId={id} files={files} onChange={refresh} />
        </aside>
        {/* U4 mounts tabs + Monaco here; U3 is the tree and its REST ops only */}
        <main className="grid flex-1 place-items-center text-sm text-muted-foreground">
          Select a file…
        </main>
      </div>
    </div>
  );
}
