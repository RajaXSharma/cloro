'use client';

import { useState } from 'react';
import type * as Y from 'yjs';
import { api } from '@/lib/api/client';
import type { CollabStatus } from '@/lib/yjs/useYDoc';
import { UserList } from '@/components/editor/presence';
import type { Awareness } from 'y-protocols/awareness';

const LANGUAGES = [
  'plaintext',
  'javascript',
  'typescript',
  'python',
  'json',
  'css',
  'html',
  'markdown',
  'sql',
] as const;

interface Props {
  docId: string;
  initialName: string;
  language: string;
  yMeta: Y.Map<unknown>;
  status: CollabStatus;
  awareness: Awareness | null;
  onLanguage: (lang: string) => void;
  onShare?: () => void;
}

export function Toolbar({ docId, initialName, language, yMeta, status, awareness, onLanguage, onShare }: Props) {
  const [name, setName] = useState(initialName);

  async function patch(body: Record<string, unknown>) {
    await api(`/documents/${docId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  return (
    <div className="flex items-center gap-3 border-b px-4 py-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name !== initialName && patch({ name })}
        className="bg-transparent text-sm font-medium outline-none"
      />
      <select
        value={language}
        aria-label="Language"
        onChange={(e) => {
          const lang = e.target.value;
          onLanguage(lang);
          yMeta.set('language', lang); // shared meta — future panels read this
          patch({ language: lang });
        }}
        className="rounded-md border bg-background px-2 py-1 text-xs"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
      <UserList awareness={awareness} />
      <span className="text-xs text-muted-foreground">{status}</span>
      {onShare && (
        <button
          type="button"
          onClick={onShare}
          className="ml-auto rounded-md border px-2 py-1 text-xs hover:bg-muted"
        >
          Share
        </button>
      )}
    </div>
  );
}
