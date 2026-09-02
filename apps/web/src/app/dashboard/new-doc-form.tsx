'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';

const LANGUAGES = ['plaintext', 'javascript', 'typescript', 'python', 'json', 'html', 'css'];

export function NewDocForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('plaintext');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await api('/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, language }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('could not create document');
      return;
    }
    setName('');
    setLanguage('plaintext');
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        required
        placeholder="document name (e.g. test.ts)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 rounded border px-3 py-2 text-sm"
      />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="rounded border px-2 py-2 text-sm"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        Create
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
