'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';

export function NewProjectForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('index.ts');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    // a project with no file would open on an empty tree — seed the first one here
    const res = await api('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, files: [{ path }] }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('could not create project');
      return;
    }
    setName('');
    setPath('index.ts');
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <input
        required
        placeholder="project name (e.g. checkout-service)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="min-w-48 flex-1 rounded border px-3 py-2 text-sm"
      />
      <input
        required
        placeholder="first file (e.g. src/index.ts)"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        className="min-w-40 flex-1 rounded border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        Create
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
