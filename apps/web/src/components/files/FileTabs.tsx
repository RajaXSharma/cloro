'use client';

import type { ProjectFile } from '@/lib/api/projects';
import type { AwarenessState } from '@/components/editor/presence';

interface Props {
  files: ProjectFile[];
  openIds: string[];
  activeId: string | null;
  /** Peers in the project (roster awareness, self excluded): dots per tab. */
  peers: AwarenessState[];
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export function FileTabs({ files, openIds, activeId, peers, onSelect, onClose }: Props) {
  const pathOf = (id: string) => files.find((f) => f.id === id)?.path ?? id;

  if (openIds.length === 0) return null;

  return (
    <div className="flex shrink-0 items-stretch overflow-x-auto border-b">
      {openIds.map((id) => {
        const path = pathOf(id);
        return (
          <div
            key={id}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                onClose(id);
              }
            }}
            className={`group flex items-center gap-1 border-r py-1.5 pl-3 pr-1.5 text-xs ${
              id === activeId ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <button
              onClick={() => onSelect(id)}
              title={path}
              className="flex min-w-0 flex-1 items-center gap-1 text-left"
            >
              <span className="max-w-48 truncate">{path.split('/').pop()}</span>
              {peers
                .filter((p) => p.user && p.openFile === id)
                .map((p) => (
                  <span
                    key={p.clientID}
                    title={`${p.user!.name} is here`}
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: p.user!.color }}
                  />
                ))}
            </button>
            <button
              onClick={() => onClose(id)}
              aria-label={`Close ${path}`}
              title="Close"
              className="grid size-4 shrink-0 place-items-center rounded hover:bg-background"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
