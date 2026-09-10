'use client';

import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { fetchToken } from '@/lib/api/client';

export type CollabStatus = 'connecting' | 'connected' | 'disconnected';

export interface CollabUser {
  name: string;
  color: string;
}

export function hashColor(seed: string): string {
  const hue = Math.abs([...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) % 360;
  return `hsl(${hue} 70% 45%)`;
}

export function useYDoc(id: string) {
  const [yDoc] = useState(() => new Y.Doc());
  const [status, setStatus] = useState<CollabStatus>('connecting');
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [user, setUser] = useState<CollabUser | null>(null);

  const [undoManager] = useState(
    () =>
      new Y.UndoManager(yDoc.getText('content'), {
        captureTimeout: 500,
        // 'ai-apply' is used by the AI sidebar (P9) so its edits are undoable too
        trackedOrigins: new Set([null, 'ai-apply']),
      }),
  );

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((s: { user?: { name?: string; email?: string } } | null) => {
        if (!s?.user) return;
        const name = s.user.name ?? s.user.email ?? 'anon';
        setUser({ name, color: hashColor(s.user.email ?? name) });
      });
  }, []);

  useEffect(() => {
    const provider = new HocuspocusProvider({
      url: process.env.NEXT_PUBLIC_HOCUSPUS_URL ?? 'ws://localhost:1234',
      name: id,
      document: yDoc,
      token: fetchToken,
    });
    provider.on('status', ({ status }: { status: CollabStatus }) => setStatus(status));
    setProvider(provider);

    return () => {
      undoManager.destroy();
      provider.destroy();
    };
  }, [id, yDoc, undoManager]);

  useEffect(() => {
    if (provider && user) provider.awareness?.setLocalStateField('user', user);
  }, [provider, user]);

  return { yDoc, provider, undoManager, status, awareness: provider?.awareness ?? null };
}
