'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { downloadProject } from '@/lib/api/projects';
import { useProjectSession } from '@/lib/yjs/useProjectSession';
import { FileTree } from '@/components/files/FileTree';
import { FileTabs } from '@/components/files/FileTabs';
import { QuickOpen } from '@/components/files/quick-open';
import { Editor } from '@/components/editor/Editor';
import { Toolbar } from '@/components/editor/Toolbar';
import { VersionPanel } from '@/components/editor/version-panel';
import { ShareDialog } from '@/components/editor/share-dialog';
import { AiSidebar } from '@/components/ai/ai-sidebar';
import { CursorStyles, ProjectRoster, useAwareness } from '@/components/editor/presence';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const shareRef = useRef<HTMLDialogElement>(null);
  const autoOpenedFor = useRef<string | null>(null);
  const { project, files, loading, error, refresh, status, rosterStatus, rosterAwareness, open, close, getSession } =
    useProjectSession(id, activeId);

  const rosterStates = useAwareness(rosterAwareness);
  const peers = rosterStates.filter((s) => s.clientID !== rosterAwareness?.clientID);

  const openTab = useCallback(
    (fileId: string) => {
      open(fileId);
      setOpenIds((prev) => (prev.includes(fileId) ? prev : [...prev, fileId]));
      setActiveId(fileId);
    },
    [open],
  );

  const closeTab = useCallback(
    (fileId: string) => {
      close(fileId);
      const next = openIds.filter((x) => x !== fileId);
      setOpenIds(next);
      if (activeId === fileId) setActiveId(next[next.length - 1] ?? null);
    },
    [close, openIds, activeId],
  );

  /** Tree mutations land here: close tabs for files the server just deleted. */
  const onFilesChange = useCallback(
    (deletedIds?: string[]) => {
      const gone = (deletedIds ?? []).filter((fileId) => openIds.includes(fileId));
      for (const fileId of gone) close(fileId);
      if (gone.length) {
        const next = openIds.filter((fileId) => !gone.includes(fileId));
        setOpenIds(next);
        if (activeId && gone.includes(activeId)) setActiveId(next[next.length - 1] ?? null);
      }
      return refresh();
    },
    [openIds, activeId, close, refresh],
  );

  useEffect(() => {
    if (error) router.replace('/dashboard');
  }, [error, router]);

  // the first file auto-opens once the list arrives, once per project. The guard
  // cannot key off `openIds` alone: closing the last tab empties it, which looks
  // identical to "nothing opened yet" and pops the tab straight back open.
  useEffect(() => {
    if (autoOpenedFor.current === id || activeId || openIds.length || files.length === 0) return;
    autoOpenedFor.current = id;
    openTab(files[0].id);
  }, [id, files, activeId, openIds.length, openTab]);

  if (loading || !project) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;

  const session = activeId ? getSession(activeId) : null;
  const activeFile = files.find((f) => f.id === activeId) ?? null;

  // no toast system in this app: failures land in the header line next to the button
  async function onDownload() {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadProject(id, project!.name);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'download failed');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-2">
        <a href="/dashboard" className="text-xs text-muted-foreground hover:underline">
          ← Projects
        </a>
        <h1 className="text-sm font-medium">{project.name}</h1>
        <span className="text-xs text-muted-foreground">{files.length} files</span>
        <div className="ml-auto flex items-center gap-3">
          <ProjectRoster states={rosterStates} files={files} />
          {downloadError && <span className="text-xs text-red-600">{downloadError}</span>}
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
          >
            {downloading ? 'Preparing…' : 'Download .zip'}
          </button>
          {project.is_owner && (
            <button
              type="button"
              onClick={() => shareRef.current?.showModal()}
              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
            >
              Share
            </button>
          )}
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 overflow-hidden border-r">
          <FileTree
            projectId={id}
            files={files}
            activeId={activeId}
            onOpen={openTab}
            onChange={onFilesChange}
          />
        </aside>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <FileTabs
            files={files}
            openIds={openIds}
            activeId={activeId}
            peers={peers}
            onSelect={setActiveId}
            onClose={closeTab}
          />
          {(status === 'disconnected' || rosterStatus === 'disconnected') && (
            <div className="shrink-0 bg-red-600 px-4 py-1.5 text-center text-xs text-white">
              Connection lost — reconnecting…
            </div>
          )}
          {session && activeFile ? (
            <>
              <CursorStyles awareness={session.provider.awareness ?? null} />
              <Toolbar path={activeFile.path} status={status} />
              <div className="min-h-0 flex-1">
                <Editor
                  key={activeId}
                  yDoc={session.yDoc}
                  provider={session.provider}
                  undoManager={session.undoManager}
                  language={activeFile.language}
                />
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
              Select a file…
            </div>
          )}
        </main>
        {/* panels follow the active tab: key remounts them per file, so an
            in-flight AI apply is dropped instead of landing in the wrong file */}
        <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l">
          {session && activeFile ? (
            <>
              <div className="max-h-56 shrink-0 overflow-y-auto border-b">
                <VersionPanel fileId={activeId!} />
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <AiSidebar key={activeId} fileId={activeId!} path={activeFile.path} yDoc={session.yDoc} />
              </div>
            </>
          ) : (
            <div className="p-3 text-xs text-muted-foreground">No file open.</div>
          )}
        </aside>
      </div>
      <QuickOpen files={files} onOpen={openTab} />
      <ShareDialog projectId={id} dialogRef={shareRef} />
    </div>
  );
}
