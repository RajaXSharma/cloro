'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

interface Snapshot {
  id: string;
  label: string | null;
  created_at: string;
}

export function VersionPanel({ fileId }: { fileId: string }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    api(`/files/${fileId}/snapshots`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setSnapshots);
  }, [fileId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function save() {
    const label = prompt('Name this version (optional)');
    if (label === null) return; // cancelled
    setBusy(true);
    await api(`/files/${fileId}/snapshots`, {
      method: 'POST',
      body: JSON.stringify({ label: label.trim() || null }),
    });
    refresh();
    setBusy(false);
  }

  async function restore(s: Snapshot) {
    if (!confirm(`Restore "${s.label ?? 'manual'}"? The current content is saved first.`)) return;
    setBusy(true);
    await api(`/files/${fileId}/snapshots`, {
      method: 'POST',
      body: JSON.stringify({ label: 'auto before restore' }),
    });
    await api(`/files/${fileId}/snapshots/${s.id}/restore`, { method: 'POST' });
    refresh();
    setBusy(false);
  }

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          Versions
        </span>
        <Button variant="outline" size="xs" onClick={save} disabled={busy}>
          Save version
        </Button>
      </div>

      {snapshots.length === 0 ? (
        <p className="text-xs text-muted-foreground">No versions yet.</p>
      ) : (
        <ul className="flex flex-col gap-1 overflow-y-auto">
          {snapshots.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-mono text-[11px] text-foreground">
                  {s.label ?? 'manual'}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {new Date(s.created_at).toLocaleTimeString()}
                </span>
              </span>
              <button
                onClick={() => restore(s)}
                disabled={busy}
                className="shrink-0 rounded-sm text-[11px] text-primary underline-offset-2 transition-colors hover:underline disabled:opacity-50"
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
