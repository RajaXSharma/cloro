'use client';

import { useEffect, useState } from 'react';
import type { Awareness } from 'y-protocols/awareness';
import type { CollabUser } from '@/lib/yjs/useProjectSession';
import { readableTextOn } from '@/lib/color';

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

/**
 * Who is in the project and which file each of them has open. Presence colors come
 * from the peer, so the label color is derived from the color rather than assumed.
 */
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
            title={path ? `${user!.name} is in ${path}` : user!.name}
            className="flex min-w-0 items-center gap-1.5"
          >
            <span
              aria-hidden="true"
              className="grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-medium"
              style={{ backgroundColor: user!.color, color: readableTextOn(user!.color) }}
            >
              {user!.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="max-w-24 truncate text-xs text-muted-foreground md:max-w-32">
              {user!.name}
            </span>
            {path && (
              <span className="hidden max-w-40 truncate font-mono text-[11px] text-muted-foreground lg:inline">
                {path}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/**
 * `hsl(217 70% 45%)` -> `hsl(217 70% 45% / 0.25)`.
 *
 * Appending an alpha byte to an `hsl()` function (`hsl(...)33`) is not valid CSS, so
 * the declaration was dropped and every peer's selection fell back to one colour.
 * Anything that is not a functional colour is returned untouched (already opaque).
 */
function withAlpha(color: string, alpha: number): string {
  return color.replace(/\)\s*$/, ` / ${alpha})`);
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
        `.yRemoteSelection-${id}{background-color:${withAlpha(user!.color, 0.25)}}`,
        `.yRemoteSelectionHead-${id}{border-color:${user!.color}}`,
        `.yRemoteSelectionHead-${id}::after{content:'${name}';background-color:${user!.color};color:${readableTextOn(user!.color)}}`,
      ].join('\n');
    })
    .join('\n');
  return <style>{css}</style>;
}
