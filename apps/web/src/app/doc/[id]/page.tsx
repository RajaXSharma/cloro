'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useYDoc } from '@/lib/yjs/useYDoc';
import { Editor } from '@/components/editor/Editor';
import { Toolbar } from '@/components/editor/Toolbar';

export default function DocPage() {
  const { id } = useParams<{ id: string }>();
  const { yDoc, provider, undoManager, status } = useYDoc(id);
  const [docName, setDocName] = useState<string | null>(null);
  const [language, setLanguage] = useState('plaintext');

  useEffect(() => {
    api(`/documents/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((doc: { name: string; language: string } | null) => {
        if (!doc) return;
        setDocName(doc.name);
        setLanguage(doc.language);
      });
  }, [id]);

  if (!docName) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;

  const yMeta = yDoc.getMap('meta');

  return (
    <div className="flex h-screen flex-col">
      <Toolbar
        docId={id}
        initialName={docName}
        language={language}
        yMeta={yMeta}
        status={status}
        onLanguage={setLanguage}
      />
      {provider ? (
        <Editor
          yDoc={yDoc}
          provider={provider}
          undoManager={undoManager}
          language={language}
        />
      ) : (
        <p className="p-8 text-sm text-muted-foreground">Connecting…</p>
      )}
    </div>
  );
}
