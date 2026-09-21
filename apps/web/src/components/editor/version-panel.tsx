'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import { searchSnapshots, type VersionHit } from '@/lib/api/projects';
import { Button } from '@/components/ui/button';
import { Input, TextField } from '@/components/ui/field';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Snapshot {
  id: string;
  label: string | null;
  created_at: string;
}

const stamp = (iso: string) => new Date(iso).toLocaleString();

/**
 * Versions belong to one file (`file_snapshots.file_id`), so the panel always shows
 * the open file's history and names that file. The search is the exception: it spans
 * the project, matching a version by its label or by the path of the file it belongs
 * to, because the whole point is finding a version when you do not know the file.
 * Results are preview only: they show metadata and never open or restore anything.
 */
export function VersionPanel({
  fileId,
  projectId,
  path,
}: {
  fileId: string;
  projectId: string;
  path: string;
}) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [busy, setBusy] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [restoring, setRestoring] = useState<Snapshot | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<VersionHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  const refresh = useCallback(() => {
    api(`/files/${fileId}/snapshots`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setSnapshots);
  }, [fileId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // debounced project-wide search; the sequence guard drops out-of-order responses
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits(null);
      setSearching(false);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = setTimeout(() => {
      searchSnapshots(projectId, q)
        .then((r) => {
          if (seq !== searchSeq.current) return;
          setHits(r);
          setSearching(false);
        })
        .catch(() => {
          if (seq !== searchSeq.current) return;
          setHits([]);
          setSearching(false);
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [query, projectId]);

  async function save() {
    setBusy(true);
    await api(`/files/${fileId}/snapshots`, {
      method: 'POST',
      body: JSON.stringify({ label: name.trim() || null }),
    });
    refresh();
    setBusy(false);
    setNaming(false);
    setName('');
  }

  async function restore() {
    if (!restoring) return; // save the current content first, so a restore is reversible (ADR 002)
    setBusy(true);
    await api(`/files/${fileId}/snapshots`, {
      method: 'POST',
      body: JSON.stringify({ label: 'auto before restore' }),
    });
    await api(`/files/${fileId}/snapshots/${restoring.id}/restore`, { method: 'POST' });
    refresh();
    setBusy(false);
    setRestoring(null);
  }

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          Versions
        </span>
        <Button variant="outline" size="xs" onClick={() => setNaming(true)} disabled={busy}>
          Save version
        </Button>
      </div>

      {/* which file these versions (and Restore) belong to: the panel is bound to it */}
      <p className="truncate font-mono text-[10px] text-muted-foreground" title={path}>
        {path}
      </p>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search all versions…"
        aria-label="Search versions by name or file"
        className="h-7 px-2 text-xs"
      />

      {query.trim() ? (
        searching && hits === null ? (
          <p className="text-xs text-muted-foreground">Searching…</p>
        ) : hits && hits.length === 0 ? (
          <p className="text-xs text-muted-foreground">No versions match this search.</p>
        ) : (
          <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto">
            {hits?.map((h) => (
              <li
                key={h.id}
                className="flex min-w-0 items-center justify-between gap-2 rounded-md border px-2 py-1.5"
                title={`${h.path} · ${stamp(h.created_at)}`}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-mono text-[11px] text-foreground">
                    {h.label ?? 'manual'}
                  </span>
                  <span className="truncate font-mono text-[10px] text-muted-foreground">
                    {h.path}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {stamp(h.created_at)}
                  </span>
                </span>
                {/* only the open file can be restored from here: a hit from another
                    file is preview only, and restoring it would target the wrong file */}
                {h.file_id === fileId && (
                  <button
                    onClick={() => setRestoring(h)}
                    disabled={busy}
                    className="shrink-0 rounded-sm text-[11px] text-primary underline-offset-2 transition-colors hover:underline disabled:opacity-50"
                  >
                    Restore
                  </button>
                )}
              </li>
            ))}
          </ul>
        )
      ) : snapshots.length === 0 ? (
        <p className="text-xs text-muted-foreground">No versions yet.</p>
      ) : (
        <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto">
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
                onClick={() => setRestoring(s)}
                disabled={busy}
                className="shrink-0 rounded-sm text-[11px] text-primary underline-offset-2 transition-colors hover:underline disabled:opacity-50"
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={naming}
        title="Save version"
        description={`Saves the current content of ${path}. Leave the name blank for an automatic one.`}
        confirmLabel="Save"
        destructive={false}
        busy={busy}
        onConfirm={save}
        onCancel={() => !busy && setNaming(false)}
      >
        <TextField
          label="Version name"
          value={name}
          autoFocus
          disabled={busy}
          placeholder="e.g. before refactor"
          onChange={(e) => setName(e.target.value)}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={restoring !== null}
        title={`Restore "${restoring?.label ?? 'manual'}"?`}
        description={`This replaces the current content of ${path}. The current content is saved as a version first, so you can undo this.`}
        confirmLabel="Restore"
        destructive={false}
        busy={busy}
        onConfirm={restore}
        onCancel={() => !busy && setRestoring(null)}
      />
    </div>
  );
}
