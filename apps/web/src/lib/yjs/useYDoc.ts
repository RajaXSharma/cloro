'use client';

import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { fetchToken } from '@/lib/api/client';

export type CollabStatus = 'connecting' | 'connected' | 'disconnected';

export function useYDoc(id: string) {
  const [yDoc] = useState(() => new Y.Doc());
  const [status, setStatus] = useState<CollabStatus>('connecting');
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  const [undoManager] = useState(
    () =>
      new Y.UndoManager(yDoc.getText('content'), {
        captureTimeout: 500,
        trackedOrigins: new Set([null, 'ai-apply']),
      }),
  );

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

  return { yDoc, provider, undoManager, status };
}
