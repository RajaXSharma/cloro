'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import type { Doc } from './doc-list';

export function DocCard({ doc, onDeleted }: { doc: Doc; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    setBusy(true);
    const res = await api(`/documents/${doc.id}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) onDeleted();
  }

  return (
    <li className="flex items-center justify-between rounded border px-4 py-3">
      <a href={`/doc/${doc.id}`} className="min-w-0">
        <p className="truncate font-medium">{doc.name}</p>
        <p className="text-xs text-gray-500">
          {doc.language} · updated {new Date(doc.updated_at).toLocaleString()}
        </p>
      </a>
      {doc.is_owner && (
        <button
          onClick={handleDelete}
          disabled={busy}
          className="ml-4 shrink-0 rounded border border-red-200 px-3 py-1 text-xs text-red-600 disabled:opacity-50"
        >
          Delete
        </button>
      )}
    </li>
  );
}
