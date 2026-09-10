'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';

interface Snapshot {
  id: string;
  label: string | null;
  created_at: string;
}

export function VersionPanel({ docId }: { docId: string }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    api(`/documents/${docId}/snapshots`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setSnapshots);
  }, [docId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function save() {
    setBusy(true);
    await api(`/documents/${docId}/snapshots`, { method: 'POST' });
    refresh();
    setBusy(false);
  }

  async function restore(sid: string) {
    setBusy(true);
    await api(`/documents/${docId}/snapshots/${sid}/restore`, { method: 'POST' });
    refresh();
    setBusy(false);
  }

  return (
    <div className="flex h-full flex-col gap-2 p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">Versions</span>
        <button
          onClick={save}
          disabled={busy}
          className="rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
        >
          Save version
        </button>
      </div>
      {snapshots.length === 0 && (
        <p className="text-xs text-muted-foreground">No versions yet.</p>
      )}
      <ul className="flex flex-col gap-1 overflow-y-auto">
        {snapshots.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1">
            <span className="min-w-0 truncate text-xs">
              {s.label ?? 'manual'} · {new Date(s.created_at).toLocaleTimeString()}
            </span>
            <button
              onClick={() => restore(s.id)}
              disabled={busy}
              className="shrink-0 text-xs text-primary underline-offset-2 hover:underline disabled:opacity-50"
            >
              Restore
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
