'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';

export function SettingsDialog({
  dialogRef,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
}) {
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api('/ai/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { ai_model: string; ai_base_url: string; has_key: boolean } | null) => {
        if (!s) return;
        setModel(s.ai_model ?? '');
        setBaseUrl(s.ai_base_url ?? '');
        setHasKey(s.has_key);
      });
  }, []);

  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const body: Record<string, string> = {};
    if (apiKey.trim()) body.api_key = apiKey.trim();
    if (model.trim()) body.model = model.trim();
    body.base_url = baseUrl.trim(); // empty string clears it
    await api('/ai/settings', { method: 'PUT', body: JSON.stringify(body) });
    setHasKey(true);
    setApiKey('');
    setSaved(true);
  }

  return (
    // native <dialog>: showModal gives the backdrop, Esc-to-close and focus for free
    <dialog
      ref={dialogRef}
      className="w-[24rem] rounded-lg border bg-background p-6 backdrop:bg-black/50"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">AI Settings</h2>
        <button
          type="button"
          aria-label="Close"
          onClick={() => dialogRef.current?.close()}
          className="px-2 text-lg text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Bring your own key — stored server-side against your account. Any
        OpenAI-compatible endpoint works (OpenAI, OpenRouter, local stub…).
      </p>
      <form onSubmit={save} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          API key{' '}
          {hasKey && (
            <span className="text-xs text-muted-foreground">(saved — leave blank to keep)</span>
          )}
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasKey ? '••••••••' : 'sk-…'}
            className="rounded-md border bg-background px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Model name
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o-mini"
            className="rounded-md border bg-background px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Base URL <span className="text-xs text-muted-foreground">(optional — blank means OpenAI)</span>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://openrouter.ai/api/v1"
            className="rounded-md border bg-background px-2 py-1"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        >
          Save
        </button>
        {saved && <span className="text-xs text-green-600">Saved.</span>}
      </form>
    </dialog>
  );
}
