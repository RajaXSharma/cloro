'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { NewDocForm } from './new-doc-form';
import { DocCard } from './doc-card';

export type Doc = {
  id: string;
  name: string;
  language: string;
  owner_id: string;
  is_owner: boolean;
  created_at: string;
  updated_at: string;
};

export function DocList() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await api('/documents');
    if (res.ok) setDocs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <NewDocForm onCreated={refresh} />
      {docs.length === 0 ? (
        <p className="text-sm text-gray-500">No documents yet — create your first one above.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <DocCard key={doc.id} doc={doc} onDeleted={refresh} />
          ))}
        </ul>
      )}
    </div>
  );
}
