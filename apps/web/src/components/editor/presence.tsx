'use client';

import { useEffect, useState } from 'react';
import type { Awareness } from 'y-protocols/awareness';
import type { CollabUser } from '@/lib/yjs/useYDoc';

export type AwarenessState = { clientID: number; user?: CollabUser; openFile?: string | null };

/** Subscribes to awareness; returns per-client states (including self). */
export function useAwareness(awareness: Awareness | null): AwarenessState[] {
  const [states, setStates] = useState<AwarenessState[]>([]);
  useEffect(() => {
    if (!awareness) return;
    const sync = () => {
      const list: AwarenessState[] = [];
      awareness.getStates().forEach((state, clientID) => list.push({ clientID, ...state }));
      setStates(list);
    };
    sync();
    awareness.on('change', sync);
    return () => {
      awareness.off('change', sync);
    };
  }, [awareness]);
  return states;
}

export function UserList({ awareness }: { awareness: Awareness | null }) {
  const states = useAwareness(awareness);
  if (states.length === 0) return null;
  return (
    <div className="flex items-center -space-x-1">
      {states.map(({ clientID, user }) => (
        <span
          key={clientID}
          title={user?.name}
          className="grid size-6 place-items-center rounded-full text-[10px] font-medium text-white"
          style={{ backgroundColor: user?.color }}
        >
          {user?.name.slice(0, 1).toUpperCase()}
        </span>
      ))}
    </div>
  );
}

export function ProjectRoster({
  states,
  files,
}: {
  states: AwarenessState[];
  files: { id: string; path: string }[];
}) {
  const present = states.filter((s) => s.user);
  if (present.length === 0) return null;
  return (
    <div className="flex items-center gap-3 overflow-hidden">
      {present.map(({ clientID, user, openFile }) => {
        const path = openFile ? files.find((f) => f.id === openFile)?.path : null;
        return (
          <span
            key={clientID}
            title={user!.name}
            className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              className="grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-medium text-white"
              style={{ backgroundColor: user!.color }}
            >
              {user!.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="max-w-40 truncate">
              {user!.name}
              {path ? ` · ${path}` : ''}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/**
 * Injects one CSS rule-set per connected client so y-monaco's built-in
 * decorations (`yRemoteSelection-<id>`, `yRemoteSelectionHead-<id>`) get the
 * client's color and a name label above the caret.
 */
export function CursorStyles({ awareness }: { awareness: Awareness | null }) {
  const states = useAwareness(awareness);
  const css = states
    .filter((s) => s.user)
    .map(({ clientID, user }) => {
      const id = String(clientID);
      const name = user!.name.replace(/['\\{}]/g, '');
      return [
        `.yRemoteSelection-${id}{background-color:${user!.color}33}`,
        `.yRemoteSelectionHead-${id}{border-color:${user!.color}}`,
        `.yRemoteSelectionHead-${id}::after{content:'${name}';background-color:${user!.color};color:#fff}`,
      ].join('\n');
    })
    .join('\n');
  return <style>{css}</style>;
}
