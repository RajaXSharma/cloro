'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { isPlaceholder, pruneTabs } from 'shared';
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
import { WorkspaceSkeleton } from '@/components/project/workspace-skeleton';
import { Button } from '@/components/ui/button';

/**
 * The workspace is a three-pane instrument on desktop. Below `lg` the panes become
 * a vertical stack: the editor first (it holds whatever auto-opened), then the file
 * tree, then the assistant. Every panel stays reachable, nothing is hidden away
 * behind a control that did not exist before.
 */
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

  // A tab is an id into `files`, but the file list can change without this
  // client acting: a collaborator deletes a file and the roster sync drops it
  // from `files`. Without this the tab lingers and shows its raw id, since
  // FileTabs falls back to the id when the path is gone.
  useEffect(() => {
    if (loading) return;
    const { openIds: next, activeId: nextActive, removed } = pruneTabs(
      openIds,
      activeId,
      files.map((f) => f.id),
    );
    if (!removed.length) return;
    for (const fileId of removed) close(fileId);
    setOpenIds(next);
    setActiveId(nextActive);
  }, [loading, files, openIds, activeId, close]);

  useEffect(() => {
    if (error) router.replace('/dashboard');
  }, [error, router]);

  // The first real file auto-opens once per project load. Placeholders are
  // skipped: a folder's `.gitkeep` (ADR 001) is hidden in the tree, so opening it
  // would surface a tab for a row the tree never shows. The guard is set as soon
  // as the file list arrives, not only when a file opens, so closing the last tab
  // cannot pop it straight back open.
  useEffect(() => {
    if (autoOpenedFor.current === id) return;
    if (files.length === 0) return; // wait for the list before deciding
    autoOpenedFor.current = id;
    if (activeId || openIds.length) return; // something is already open
    const first = files.find((f) => !isPlaceholder(f.path));
    if (first) openTab(first.id);
  }, [id, files, activeId, openIds.length, openTab]);

  if (loading || !project) return <WorkspaceSkeleton />;

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
    <div className="flex min-h-[100dvh] flex-col lg:h-[100dvh]">
      <header className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b bg-panel px-3 py-2 md:px-4">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Projects
        </Link>
        <span className="h-4 w-px shrink-0 bg-border" aria-hidden="true" />
        <h1 className="min-w-0 truncate text-sm font-medium">{project.name}</h1>
        <span className="meta hidden shrink-0 sm:inline">{files.length} files</span>
        <div className="ml-auto flex items-center gap-3">
          <ProjectRoster states={rosterStates} files={files} />
          {downloadError && (
            <span role="alert" className="hidden text-xs text-destructive sm:inline">
              {downloadError}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDownload}
            disabled={downloading}
            aria-busy={downloading}
          >
            <Download aria-hidden="true" />
            <span className="hidden sm:inline">{downloading ? 'Preparing…' : 'Download .zip'}</span>
            <span className="sm:hidden">Zip</span>
          </Button>
          {project.is_owner && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => shareRef.current?.showModal()}
            >
              <Share2 aria-hidden="true" />
              Share
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row lg:overflow-hidden">
        {/* Editor first on small screens: it holds the auto-opened file. */}
        <main className="order-1 flex min-w-0 flex-col lg:order-2 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
          <FileTabs
            files={files}
            openIds={openIds}
            activeId={activeId}
            peers={peers}
            onSelect={setActiveId}
            onClose={closeTab}
          />

          {(status === 'disconnected' || rosterStatus === 'disconnected') && (
            <div
              role="status"
              className="shrink-0 border-b border-destructive/40 bg-destructive/8 px-4 py-1.5 text-center text-xs font-medium text-destructive"
            >
              Connection lost. Reconnecting…
            </div>
          )}

          {session && activeFile ? (
            <>
              <CursorStyles awareness={session.provider.awareness ?? null} />
              <Toolbar path={activeFile.path} status={status} />
              <div className="min-h-[60dvh] lg:min-h-0 lg:flex-1">
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
            <div className="grid min-h-[40dvh] place-items-center px-4 text-center lg:flex-1">
              <p className="text-sm text-muted-foreground">
                Select a file, or press{' '}
                <kbd className="rounded-sm border bg-panel px-1.5 py-0.5 font-mono text-xs">Ctrl</kbd>{' '}
                <kbd className="rounded-sm border bg-panel px-1.5 py-0.5 font-mono text-xs">P</kbd> to
                search.
              </p>
            </div>
          )}
        </main>

        <aside className="order-2 h-64 shrink-0 overflow-hidden border-t bg-panel lg:order-1 lg:h-auto lg:w-64 lg:border-t-0 lg:border-r">
          <FileTree
            projectId={id}
            files={files}
            activeId={activeId}
            onOpen={openTab}
            onChange={refresh}
          />
        </aside>

        {/* panels follow the active tab: key remounts them per file, so an
            in-flight AI apply is dropped instead of landing in the wrong file */}
        <aside className="order-3 flex h-[30rem] shrink-0 flex-col overflow-hidden border-t bg-panel lg:h-auto lg:w-80 lg:border-t-0 lg:border-l">
          {session && activeFile ? (
            <>
              <div className="max-h-56 shrink-0 overflow-y-auto border-b">
                <VersionPanel fileId={activeId!} projectId={id} path={activeFile.path} />
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <AiSidebar
                  key={activeId}
                  fileId={activeId!}
                  path={activeFile.path}
                  yDoc={session.yDoc}
                />
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
