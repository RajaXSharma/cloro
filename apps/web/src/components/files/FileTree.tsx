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
import { FileIcon } from './file-icons';

interface Props {
  projectId: string;
  files: ProjectFile[];
  /** Highlighted row (the open tab). */
  activeId?: string | null;
  /** Clicking a file row opens it as a tab. */
  onOpen: (fileId: string) => void;
  /** Receives the deleted file ids so the page can close their tabs, and refetches
   * the list — awaited before a newly created file is opened, so its tab has a path. */
  onChange: (deletedIds?: string[]) => unknown;
}

type Creating = { mode: 'file' | 'folder'; dir: string } | null;

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

  async function run<T>(op: () => Promise<T>): Promise<T | null> {
    setError('');
    try {
      const result = await op();
      await onChange((result as { deleted?: string[] } | null)?.deleted);
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
      <input
        autoFocus
        value={newPath}
        placeholder={
          creating?.mode === 'folder' ? 'folder name' : creating?.dir ? 'name.ts' : 'src/lib/x.ts'
        }
        onChange={(e) => setNewPath(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === 'Escape') setCreating(null);
          if (e.key === 'Enter') await submitNew();
        }}
        onBlur={() => setCreating(null)}
        className="w-full rounded border bg-background px-2 py-1 text-xs"
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
            className={`group flex items-center gap-1.5 py-1 pr-1 ${
              active ? 'bg-muted font-medium' : 'hover:bg-muted'
            }`}
            style={pad}
          >
            {renamingId === node.id ? (
              <input
                autoFocus
                value={renamePath}
                onChange={(e) => setRenamePath(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Escape') setRenamingId(null);
                  if (e.key === 'Enter' && (await run(() => renameFile(node.id, renamePath.trim()))))
                    setRenamingId(null);
                }}
                onBlur={() => setRenamingId(null)}
                className="w-full rounded border bg-background px-1 text-xs"
              />
            ) : (
              <>
                <button
                  onClick={() => onOpen(node.id)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  <FileIcon name={node.name} className="size-3.5 shrink-0" />
                  <span className="truncate text-xs">{node.name}</span>
                </button>
                <span className="flex shrink-0 items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
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
                    className="rounded p-0.5 hover:bg-background"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    onClick={() =>
                      confirm(`Delete "${node.path}"?`) && run(() => deleteFile(node.id))
                    }
                    title={`Delete ${node.path}`}
                    aria-label={`Delete ${node.path}`}
                    className="rounded p-0.5 text-red-600 hover:bg-background"
                  >
                    <Trash2 className="size-3" />
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
          <div className="group flex items-center gap-1.5 py-1 pr-1 hover:bg-muted" style={pad}>
            {renamingThis ? (
              <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs">
                {renamingFolder.parent && (
                  <span className="shrink-0 text-muted-foreground">{renamingFolder.parent}/</span>
                )}
                <input
                  autoFocus
                  value={folderName}
                  aria-label={`Rename folder ${node.path}`}
                  onChange={(e) => setFolderName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Escape') setRenamingFolder(null);
                    if (e.key === 'Enter') await submitFolderRename();
                  }}
                  onBlur={() => setRenamingFolder(null)}
                  className="min-w-0 flex-1 rounded border bg-background px-1 text-xs"
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
                    <ChevronRight className="size-3.5 shrink-0" />
                  ) : (
                    <ChevronDown className="size-3.5 shrink-0" />
                  )}
                  <span className="truncate text-xs font-medium">{node.name}</span>
                </button>
                <span className="flex shrink-0 items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    onClick={() => startCreate('file', node.path)}
                    title={`New file in ${node.path}`}
                    aria-label={`New file in ${node.path}`}
                    className="rounded p-0.5 hover:bg-background"
                  >
                    <FilePlus2 className="size-3" />
                  </button>
                  <button
                    onClick={() => startCreate('folder', node.path)}
                    title={`New folder in ${node.path}`}
                    aria-label={`New folder in ${node.path}`}
                    className="rounded p-0.5 hover:bg-background"
                  >
                    <FolderPlus className="size-3" />
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
                    className="rounded p-0.5 hover:bg-background"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    onClick={() =>
                      confirm(`Delete folder "${node.path}" and everything in it?`) &&
                      run(() => deleteFolder(projectId, node.path))
                    }
                    title={`Delete folder ${node.path}`}
                    aria-label={`Delete folder ${node.path}`}
                    className="rounded p-0.5 text-red-600 hover:bg-background"
                  >
                    <Trash2 className="size-3" />
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
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Files</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => startCreate('file')}
            title="New file"
            aria-label="New file"
            className="rounded border p-1 hover:bg-muted"
          >
            <FilePlus2 className="size-3.5" />
          </button>
          <button
            onClick={() => startCreate('folder')}
            title="New folder"
            aria-label="New folder"
            className="rounded border p-1 hover:bg-muted"
          >
            <FolderPlus className="size-3.5" />
          </button>
        </div>
      </div>
      {error && <p className="border-b px-3 py-1 text-xs text-red-600">{error}</p>}
      <div className="flex-1 overflow-y-auto py-1 text-sm">
        {creating?.dir === '' && newPathRow(0)}
        {tree.length === 0 && !creating ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No files yet — add one above.</p>
        ) : (
          rows(tree, 0)
        )}
      </div>
    </div>
  );
}
