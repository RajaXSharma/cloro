'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';

interface Collaborator {
  id: string;
  email: string;
  name: string;
}

export function ShareDialog({
  docId,
  dialogRef,
}: {
  docId: string;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
}) {
  const [collabs, setCollabs] = useState<Collaborator[] | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // fresh list every time the dialog opens
  function open() {
    dialogRef.current?.showModal();
    setError(null);
    api(`/documents/${docId}/collaborators`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setCollabs);
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await api(`/documents/${docId}/collaborators`, {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'invite failed' }));
      setError(error);
    } else {
      setEmail('');
      const list = await api(`/documents/${docId}/collaborators`);
      setCollabs(await list.json());
    }
    setBusy(false);
  }

  async function remove(id: string) {
    setBusy(true);
    await api(`/documents/${docId}/collaborators/${id}`, { method: 'DELETE' });
    setCollabs((c) => c?.filter((x) => x.id !== id) ?? null);
    setBusy(false);
  }

  return (
    // native <dialog>: showModal gives the backdrop, Esc-to-close and focus for free
    <dialog
      ref={dialogRef}
      className="w-[24rem] rounded-lg border bg-background p-6 backdrop:bg-black/50"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Share</h2>
        <button
          type="button"
          aria-label="Close"
          onClick={() => dialogRef.current?.close()}
          className="px-2 text-lg text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <form onSubmit={invite} className="mb-4 flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="collaborator@email.com"
          className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
        >
          Invite
        </button>
      </form>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      {collabs === null ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : collabs.length === 0 ? (
        <p className="text-xs text-muted-foreground">No collaborators yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {collabs.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm">
              <span className="min-w-0 truncate">
                {c.name} <span className="text-xs text-muted-foreground">{c.email}</span>
              </span>
              <button
                type="button"
                onClick={() => remove(c.id)}
                disabled={busy}
                className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </dialog>
  );
}
