'use client';

import { X } from 'lucide-react';

import type { ProjectFile } from '@/lib/api/projects';
import type { AwarenessState } from '@/components/editor/presence';
import { FileIcon } from '@/components/files/file-icons';

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
    <div className="flex shrink-0 items-stretch overflow-x-auto border-b bg-background">
      {openIds.map((id) => {
        const path = pathOf(id);
        const active = id === activeId;
        return (
          <div
            key={id}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                onClose(id);
              }
            }}
            className={`group relative flex items-center gap-1 border-r pr-1 transition-colors ${
              active
                ? 'bg-secondary/60 text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            {active && (
              <span className="absolute inset-x-0 top-0 h-0.5 bg-primary" aria-hidden="true" />
            )}
            <button
              onClick={() => onSelect(id)}
              title={path}
              aria-current={active ? 'true' : undefined}
              className="flex min-w-0 flex-1 items-center gap-1.5 py-2 pr-1 pl-3 text-left text-xs"
            >
              <FileIcon name={path} className="size-3.5 shrink-0" />
              <span className="max-w-40 truncate">{path.split('/').pop()}</span>
              {peers
                .filter((p) => p.user && p.openFile === id)
                .map((p) => (
                  <span
                    key={p.clientID}
                    title={`${p.user!.name} is here`}
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: p.user!.color }}
                  />
                ))}
            </button>
            <button
              onClick={() => onClose(id)}
              aria-label={`Close ${path}`}
              title="Close"
              className="grid size-4 shrink-0 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:bg-background focus-visible:text-foreground"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
