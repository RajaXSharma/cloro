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
import { isValidPath, parsePaths, type TreeNode } from 'shared';
import {
  createFile,
  deleteFile,
  deleteFolder,
  renameFile,
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
  /** Receives the deleted file ids so the page can close their tabs. */
  onChange: (deletedIds?: string[]) => void;
}

type Creating = 'file' | 'folder' | null;

/**
 * The tree is derived from the flat path list (`parsePaths`), so folders are
 * prefixes, never rows: nesting comes from typing `src/lib/x.ts`, a "folder
 * delete" is a prefix delete, and there is no empty-folder state to render.
 * `New folder` writes `name/.gitkeep` (ADR 001), which the tree hides.
 */
export function FileTree({ projectId, files, activeId, onOpen, onChange }: Props) {
  const [creating, setCreating] = useState<Creating>(null);
  const [newPath, setNewPath] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamePath, setRenamePath] = useState('');
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [error, setError] = useState('');

  async function run(op: () => Promise<unknown>) {
    setError('');
    try {
      const result = await op();
      onChange((result as { deleted?: string[] } | null)?.deleted);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'request failed');
      return false;
    }
  }

  function startCreate(mode: Creating) {
    setCreating(mode);
    setNewPath('');
    setRenamingId(null);
    setError('');
  }

  async function submitNew() {
    const value = newPath.trim();
    if (!value) return;
    // a folder is a path prefix, so it is materialised by its hidden placeholder
    const path = creating === 'folder' ? `${value.replace(/\/+$/, '')}/.gitkeep` : value;
    if (!isValidPath(path)) {
      setError('invalid path');
      return;
    }
    if (await run(() => createFile(projectId, path))) setCreating(null);
  }

  const rows = (nodes: TreeNode[], depth: number): ReactNode =>
    nodes.map((node) => {
      const pad = { paddingLeft: `${depth * 12 + 8}px` };

      if (node.type === 'file') {
        if (node.name === '.gitkeep') return null; // folder placeholder, not a file
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
      return (
        <div key={node.path}>
          <div
            className="group flex items-center gap-1.5 py-1 pr-1 hover:bg-muted"
            style={pad}
          >
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
            <button
              onClick={() =>
                confirm(`Delete folder "${node.path}" and everything in it?`) &&
                run(() => deleteFolder(projectId, node.path))
              }
              title={`Delete folder ${node.path}`}
              aria-label={`Delete folder ${node.path}`}
              className="shrink-0 rounded p-0.5 text-red-600 opacity-0 hover:bg-background group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
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
        {creating && (
          <input
            autoFocus
            value={newPath}
            placeholder={creating === 'folder' ? 'folder name' : 'src/lib/x.ts'}
            onChange={(e) => setNewPath(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Escape') setCreating(null);
              if (e.key === 'Enter') await submitNew();
            }}
            onBlur={() => setCreating(null)}
            className="mx-3 my-1 w-[calc(100%-1.5rem)] rounded border bg-background px-2 py-1 text-xs"
          />
        )}
        {tree.length === 0 && !creating ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No files yet — add one above.</p>
        ) : (
          rows(tree, 0)
        )}
      </div>
    </div>
  );
}
