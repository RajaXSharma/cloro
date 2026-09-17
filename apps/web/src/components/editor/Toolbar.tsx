'use client';

import type { CollabStatus } from '@/lib/yjs/useProjectSession';

interface Props {
  /** The active file's path — renamed in the tree, so it is text, not an input. */
  path: string;
  status: CollabStatus;
}

export function Toolbar({ path, status }: Props) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-1.5">
      <span className="truncate text-xs font-medium" title={path}>
        {path}
      </span>
      <span className="ml-auto text-xs text-muted-foreground">{status}</span>
    </div>
  );
}
