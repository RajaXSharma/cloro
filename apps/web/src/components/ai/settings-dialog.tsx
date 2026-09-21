'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';

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
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border bg-popover p-6 text-popover-foreground shadow-2xl backdrop:bg-black/60"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">AI Settings</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Bring your own key, stored server-side against your account. Any
            OpenAI-compatible endpoint works (OpenAI, OpenRouter, local stub…).
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

      <form onSubmit={save} className="flex flex-col gap-4">
        <TextField
          label="API key"
          name="api_key"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={hasKey ? '••••••••' : 'sk-…'}
          hint={hasKey ? 'A key is saved. Leave blank to keep it.' : undefined}
        />
        <TextField
          label="Model name"
          name="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="gpt-4o-mini"
        />
        <TextField
          label="Base URL"
          name="base_url"
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://openrouter.ai/api/v1"
          hint="Optional. Blank means OpenAI."
        />
        <div className="flex items-center gap-3">
          <Button type="submit" className="h-9">
            Save
          </Button>
          {saved && (
            <span role="status" className="text-xs text-muted-foreground">
              Saved.
            </span>
          )}
        </div>
      </form>
    </dialog>
  );
}
