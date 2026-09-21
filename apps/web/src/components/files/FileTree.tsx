'use client';

import { useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FolderPlus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { isPlaceholder, isValidPath, isValidSegment, joinPath, parentOf, parsePaths, type TreeNode } from 'shared';
import {
  createFile,
  deleteFile,
  deleteFolder,
  renameFile,
  renameFolder,
  type ProjectFile,
} from '@/lib/api/projects';
import { Input } from '@/components/ui/field';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FileIcon } from './file-icons';

interface Props {
  projectId: string;
  files: ProjectFile[];
  /** Highlighted row (the open tab). */
  activeId?: string | null;
  /** Clicking a file row opens it as a tab. */
  onOpen: (fileId: string) => void;
  /** Refetches the file list after a create/rename/delete; awaited before a newly
   * created file is opened, so its tab has a path. */
  onChange: () => unknown;
}

type Creating = { mode: 'file' | 'folder'; dir: string } | null;

/** Hover actions stay visible below `md`, where there is no hover to reveal them. */
const ACTION_BUTTON =
  'rounded-sm p-0.5 transition-colors hover:bg-background focus-visible:bg-background';
const ACTION_CLUSTER =
  'flex shrink-0 items-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100';

/**
 * The tree is derived from the flat path list (`parsePaths`), so folders are
 * prefixes, never rows: nesting comes from typing `src/lib/x.ts`, a "folder
 * delete" is a prefix delete, and there is no empty-folder state to render.
 * `New folder` writes `name/.gitkeep` (ADR 001), which the tree hides.
 *
 * Those header buttons create at the project root; a folder's own `+` creates
 * inside it instead, and a folder's pencil renames just its last segment
 * (ADR 003).
 */
export function FileTree({ projectId, files, activeId, onOpen, onChange }: Props) {
  const [creating, setCreating] = useState<Creating>(null);
  const [newPath, setNewPath] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamePath, setRenamePath] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<{ path: string; parent: string } | null>(
    null,
  );
  const [folderName, setFolderName] = useState('');
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    action: () => Promise<unknown>;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    await pendingDelete.action();
    setDeleting(false);
    setPendingDelete(null);
  }

  async function run<T>(op: () => Promise<T>): Promise<T | null> {
    setError('');
    try {
      const result = await op();
      await onChange();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
      return null;
    }
  }

  // the folder being written into has to be open, or its input and the new row are hidden
  const expand = (dir: string) => setCollapsed((c) => c.filter((p) => p !== dir));

  function startCreate(mode: 'file' | 'folder', dir = '') {
    setCreating({ mode, dir });
    setNewPath('');
    setRenamingId(null);
    setRenamingFolder(null);
    setError('');
    expand(dir);
  }

  async function submitNew() {
    if (!creating) return;
    const { mode, dir } = creating;
    const name = newPath.trim();
    if (!name) return;
    // a folder is a path prefix, so it is materialised by its hidden placeholder
    const path =
      mode === 'folder'
        ? `${joinPath(dir, name.replace(/\/+$/, ''))}/.gitkeep`
        : joinPath(dir, name);
    if (!isValidPath(path)) {
      setError('invalid path');
      return;
    }
    const created = await run(() => createFile(projectId, path));
    if (!created) return;
    setNewPath(''); // the input stays open under this folder for the next name
    if (mode === 'file') onOpen(created.id); // else it is a hidden placeholder
  }

  async function submitFolderRename() {
    if (!renamingFolder) return;
    const { path, parent } = renamingFolder;
    const name = folderName.trim();
    if (!name) return;
    if (!isValidSegment(name)) {
      setError('invalid folder name');
      return;
    }
    const to = joinPath(parent, name);
    if (to === path) {
      setRenamingFolder(null);
      return;
    }
    if (!(await run(() => renameFolder(projectId, path, to)))) return;
    // keep any collapsed folder pointing at the new prefix
    setCollapsed((c) =>
      c.map((p) => (p === path || p.startsWith(`${path}/`) ? to + p.slice(path.length) : p)),
    );
    setRenamingFolder(null);
  }

  // one input, either at the root or indented under the folder it writes into
  const newPathRow = (depth: number) => (
    <div className="py-1 pr-1" style={{ paddingLeft: `${depth * 12 + 8}px` }}>
      <Input
        autoFocus
        value={newPath}
        placeholder={
          creating?.mode === 'folder' ? 'folder name' : creating?.dir ? 'name.ts' : 'src/lib/x.ts'
        }
        aria-label={creating?.mode === 'folder' ? 'New folder name' : 'New file path'}
        onChange={(e) => setNewPath(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === 'Escape') setCreating(null);
          if (e.key === 'Enter') await submitNew();
        }}
        onBlur={() => setCreating(null)}
        className="h-7 px-2 text-xs"
      />
    </div>
  );

  const rows = (nodes: TreeNode[], depth: number): ReactNode =>
    nodes.map((node) => {
      const pad = { paddingLeft: `${depth * 12 + 8}px` };

      if (node.type === 'file') {
        if (isPlaceholder(node.path)) return null; // folder placeholder, not a file
        const active = node.id === activeId;
        return (
          <div
            key={node.id}
            className={`group flex items-center gap-1.5 py-1 pr-1 transition-colors ${
              active ? 'bg-primary/12 text-foreground' : 'hover:bg-muted'
            }`}
            style={pad}
          >
            {renamingId === node.id ? (
              <Input
                autoFocus
                value={renamePath}
                aria-label={`Rename ${node.path}`}
                onChange={(e) => setRenamePath(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Escape') setRenamingId(null);
                  if (e.key === 'Enter' && (await run(() => renameFile(node.id, renamePath.trim()))))
                    setRenamingId(null);
                }}
                onBlur={() => setRenamingId(null)}
                className="h-7 px-2 text-xs"
              />
            ) : (
              <>
                <button
                  onClick={() => onOpen(node.id)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  <FileIcon name={node.name} className="size-3.5 shrink-0" />
                  <span className={`truncate text-xs ${active ? 'font-medium' : ''}`}>
                    {node.name}
                  </span>
                </button>
                <span className={ACTION_CLUSTER}>
                  <button
                    onClick={() => {
                      setRenamingId(node.id);
                      setRenamePath(node.path);
                      setCreating(null);
                      setRenamingFolder(null);
                      setError('');
                    }}
                    title={`Rename ${node.path}`}
                    aria-label={`Rename ${node.path}`}
                    className={`${ACTION_BUTTON} text-muted-foreground hover:text-foreground`}
                  >
                    <Pencil className="size-3" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() =>
                      setPendingDelete({
                        title: `Delete "${node.path}"?`,
                        description:
                          'This removes the file for everyone in the project. This cannot be undone.',
                        confirmLabel: 'Delete',
                        action: () => run(() => deleteFile(node.id)),
                      })
                    }
                    title={`Delete ${node.path}`}
                    aria-label={`Delete ${node.path}`}
                    className={`${ACTION_BUTTON} text-destructive hover:bg-destructive/10`}
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                  </button>
                </span>
              </>
            )}
          </div>
        );
      }

      const isCollapsed = collapsed.includes(node.path);
      const renamingThis = renamingFolder?.path === node.path;
      return (
        <div key={node.path}>
          <div className="group flex items-center gap-1.5 py-1 pr-1 transition-colors hover:bg-muted" style={pad}>
            {renamingThis ? (
              <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs">
                {renamingFolder.parent && (
                  <span className="shrink-0 font-mono text-muted-foreground">
                    {renamingFolder.parent}/
                  </span>
                )}
                <Input
                  autoFocus
                  value={folderName}
                  aria-label={`Rename folder ${node.path}`}
                  onChange={(e) => setFolderName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Escape') setRenamingFolder(null);
                    if (e.key === 'Enter') await submitFolderRename();
                  }}
                  onBlur={() => setRenamingFolder(null)}
                  className="h-7 min-w-0 flex-1 px-2 text-xs"
                />
              </span>
            ) : (
              <>
                <button
                  onClick={() =>
                    setCollapsed((c) =>
                      isCollapsed ? c.filter((p) => p !== node.path) : [...c, node.path],
                    )
                  }
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  {isCollapsed ? (
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span className="truncate text-xs font-medium">{node.name}</span>
                </button>
                <span className={ACTION_CLUSTER}>
                  <button
                    onClick={() => startCreate('file', node.path)}
                    title={`New file in ${node.path}`}
                    aria-label={`New file in ${node.path}`}
                    className={`${ACTION_BUTTON} text-muted-foreground hover:text-foreground`}
                  >
                    <FilePlus2 className="size-3" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => startCreate('folder', node.path)}
                    title={`New folder in ${node.path}`}
                    aria-label={`New folder in ${node.path}`}
                    className={`${ACTION_BUTTON} text-muted-foreground hover:text-foreground`}
                  >
                    <FolderPlus className="size-3" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => {
                      setRenamingFolder({ path: node.path, parent: parentOf(node.path) });
                      setFolderName(node.name);
                      setCreating(null);
                      setRenamingId(null);
                      setError('');
                    }}
                    title={`Rename folder ${node.path}`}
                    aria-label={`Rename folder ${node.path}`}
                    className={`${ACTION_BUTTON} text-muted-foreground hover:text-foreground`}
                  >
                    <Pencil className="size-3" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() =>
                      setPendingDelete({
                        title: `Delete "${node.path}"?`,
                        description:
                          'This removes the folder and everything inside it for everyone in the project. This cannot be undone.',
                        confirmLabel: 'Delete folder',
                        action: () => run(() => deleteFolder(projectId, node.path)),
                      })
                    }
                    title={`Delete folder ${node.path}`}
                    aria-label={`Delete folder ${node.path}`}
                    className={`${ACTION_BUTTON} text-destructive hover:bg-destructive/10`}
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                  </button>
                </span>
              </>
            )}
          </div>
          {creating?.dir === node.path && newPathRow(depth + 1)}
          {!isCollapsed && rows(node.children, depth + 1)}
        </div>
      );
    });

  const tree = parsePaths(files);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
        <span className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          Files
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => startCreate('file')}
            title="New file"
            aria-label="New file"
            className={`${ACTION_BUTTON} border text-muted-foreground hover:text-foreground`}
          >
            <FilePlus2 className="size-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={() => startCreate('folder')}
            title="New folder"
            aria-label="New folder"
            className={`${ACTION_BUTTON} border text-muted-foreground hover:text-foreground`}
          >
            <FolderPlus className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="shrink-0 border-b px-3 py-1 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {creating?.dir === '' && newPathRow(0)}
        {tree.length === 0 && !creating ? (
          <div className="px-3 py-3">
            <p className="text-xs font-medium">No files yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Add one above.</p>
          </div>
        ) : (
          rows(tree, 0)
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete?.title ?? ''}
        description={pendingDelete?.description}
        confirmLabel={pendingDelete?.confirmLabel}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setPendingDelete(null)}
      />
    </div>
  );
}
