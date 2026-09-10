'use client';

import { useEffect, useState } from 'react';
import type { Awareness } from 'y-protocols/awareness';
import type { CollabUser } from '@/lib/yjs/useYDoc';

type State = { clientID: number; user?: CollabUser };

/** Subscribes to awareness; returns per-client states (including self). */
function useAwareness(awareness: Awareness | null): State[] {
  const [states, setStates] = useState<State[]>([]);
  useEffect(() => {
    if (!awareness) return;
    const sync = () => {
      const list: State[] = [];
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
