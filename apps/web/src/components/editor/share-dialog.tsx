'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { FormError, TextField } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';

interface Collaborator {
  id: string;
  email: string;
  name: string;
}

export function ShareDialog({
  projectId,
  dialogRef,
}: {
  projectId: string;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
}) {
  const [collabs, setCollabs] = useState<Collaborator[] | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api(`/projects/${projectId}/collaborators`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setCollabs);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function invite(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await api(`/projects/${projectId}/collaborators`, {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'invite failed' }));
      setError(error);
    } else {
      setEmail('');
      load();
    }
    setBusy(false);
  }

  async function remove(id: string) {
    setBusy(true);
    await api(`/projects/${projectId}/collaborators/${id}`, { method: 'DELETE' });
    setCollabs((c) => c?.filter((x) => x.id !== id) ?? null);
    setBusy(false);
  }

  return (
    // native <dialog>: showModal gives the backdrop, Esc-to-close and focus for free
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border bg-popover p-6 text-popover-foreground shadow-2xl backdrop:bg-black/60"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Share</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Anyone you add can create, rename and delete files.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={() => dialogRef.current?.close()}
          className="-mr-1 -mt-1 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={invite} className="flex flex-col gap-3 border-b pb-4">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <TextField
              label="Invite by email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="collaborator@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9"
            />
          </div>
          <Button type="submit" disabled={busy || !email.trim()} className="h-9 shrink-0">
            <UserPlus aria-hidden="true" />
            Invite
          </Button>
        </div>
        {error && <FormError>{error}</FormError>}
      </form>

      {collabs === null ? (
        <>
          <p role="status" className="sr-only">
            Loading collaborators
          </p>
          <ul className="flex flex-col divide-y pt-2" aria-hidden="true">
            {[0, 1].map((i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="mt-1.5 h-3 w-40" />
                </span>
                <Skeleton className="h-3 w-12" />
              </li>
            ))}
          </ul>
        </>
      ) : collabs.length === 0 ? (
        <p className="pt-4 text-xs text-muted-foreground">No collaborators yet.</p>
      ) : (
        <ul className="flex flex-col divide-y pt-2">
          {collabs.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm">{c.name}</span>
                <span className="block truncate font-mono text-[11px] text-muted-foreground">
                  {c.email}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(c.id)}
                disabled={busy}
                className="shrink-0 rounded-sm text-xs text-destructive underline-offset-2 transition-colors hover:underline disabled:opacity-50"
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
