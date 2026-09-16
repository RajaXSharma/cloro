'use client';

import { useState, type ReactNode } from 'react';
import { parsePaths, type TreeNode } from 'shared';
import {
  createFile,
  deleteFile,
  deleteFolder,
  renameFile,
  type ProjectFile,
} from '@/lib/api/projects';

interface Props {
  projectId: string;
  files: ProjectFile[];
  /** Receives the deleted file ids so the page can close their tabs. */
  onChange: (deletedIds?: string[]) => void;
}

/**
 * The tree is derived from the flat path list (`parsePaths`), so folders are
 * prefixes, never rows: nesting comes from typing `src/lib/x.ts`, a "folder
 * delete" is a prefix delete, and there is no empty-folder state to render.
 */
export function FileTree({ projectId, files, onChange }: Props) {
  const [creating, setCreating] = useState(false);
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

  const rows = (nodes: TreeNode[], depth: number): ReactNode =>
    nodes.map((node) => {
      const pad = { paddingLeft: `${depth * 12 + 12}px` };

      if (node.type === 'file') {
        return (
          <div key={node.id} className="group flex items-center gap-1 py-0.5 pr-2 hover:bg-muted" style={pad}>
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
                <span className="truncate">{node.name}</span>
                <button
                  onClick={() => {
                    setRenamingId(node.id);
                    setRenamePath(node.path);
                    setCreating(false);
                    setError('');
                  }}
                  className="ml-auto hidden text-[10px] text-muted-foreground group-hover:block"
                >
                  rename
                </button>
                <button
                  onClick={() => confirm(`Delete "${node.path}"?`) && run(() => deleteFile(node.id))}
                  className="hidden text-[10px] text-red-600 group-hover:block"
                >
                  delete
                </button>
              </>
            )}
          </div>
        );
      }

      const isCollapsed = collapsed.includes(node.path);
      return (
        <div key={node.path}>
          <div className="group flex items-center gap-1 py-0.5 pr-2 hover:bg-muted" style={pad}>
            <button
              onClick={() =>
                setCollapsed((c) => (isCollapsed ? c.filter((p) => p !== node.path) : [...c, node.path]))
              }
              className="truncate text-left text-xs font-medium"
            >
              {isCollapsed ? '▸' : '▾'} {node.name}
            </button>
            <button
              onClick={() =>
                confirm(`Delete folder "${node.path}" and everything in it?`) &&
                run(() => deleteFolder(projectId, node.path))
              }
              className="ml-auto hidden text-[10px] text-red-600 group-hover:block"
            >
              delete
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
        <button
          onClick={() => {
            setCreating(true);
            setNewPath('');
            setRenamingId(null);
            setError('');
          }}
          className="rounded border px-2 py-0.5 text-xs hover:bg-muted"
        >
          + file
        </button>
      </div>
      {error && <p className="border-b px-3 py-1 text-xs text-red-600">{error}</p>}
      <div className="flex-1 overflow-y-auto py-1 text-sm">
        {creating && (
          <input
            autoFocus
            value={newPath}
            placeholder="src/lib/x.ts"
            onChange={(e) => setNewPath(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Escape') setCreating(false);
              if (e.key === 'Enter' && newPath.trim() && (await run(() => createFile(projectId, newPath.trim()))))
                setCreating(false);
            }}
            onBlur={() => setCreating(false)}
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
