'use client';

import type { CollabStatus } from '@/lib/yjs/useProjectSession';

interface Props {
  /** The active file's path, renamed in the tree, so it is text, not an input. */
  path: string;
  status: CollabStatus;
}

/**
 * The dot is not decoration: it is the live socket state, and the text beside it
 * says the same thing so the state never depends on color alone.
 */
const STATUS: Record<CollabStatus, { dot: string; label: string }> = {
  connected: { dot: 'bg-emerald-400', label: 'connected' },
  connecting: { dot: 'bg-amber-400', label: 'connecting' },
  disconnected: { dot: 'bg-destructive', label: 'disconnected' },
};

export function Toolbar({ path, status }: Props) {
  const { dot, label } = STATUS[status];

  return (
    <div className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-1.5">
      <span className="truncate font-mono text-xs text-foreground" title={path}>
        {path}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-1.5">
        <span className={`size-1.5 rounded-full ${dot}`} aria-hidden="true" />
        <span
          className={`font-mono text-[11px] ${
            status === 'disconnected' ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {label}
        </span>
      </span>
    </div>
  );
}
