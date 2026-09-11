'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useYDoc } from '@/lib/yjs/useYDoc';
import { Editor } from '@/components/editor/Editor';
import { Toolbar } from '@/components/editor/Toolbar';
import { CursorStyles } from '@/components/editor/presence';
import { VersionPanel } from '@/components/editor/version-panel';
import { AiSidebar } from '@/components/ai/ai-sidebar';
import { ShareDialog } from '@/components/editor/share-dialog';

export default function DocPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { yDoc, provider, undoManager, status, awareness } = useYDoc(id);
  const [docName, setDocName] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [language, setLanguage] = useState('plaintext');
  const shareRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    api(`/documents/${id}`)
      .then((res) => {
        // 403 = no access, 404 = gone — neither recovers by waiting
        if (!res.ok) return router.replace('/dashboard');
        return res.json();
      })
      .then((doc: { name: string; language: string; is_owner: boolean } | null) => {
        if (!doc) return;
        setDocName(doc.name);
        setIsOwner(doc.is_owner);
        setLanguage(doc.language);
      });
  }, [id, router]);

  if (!docName) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;

  const yMeta = yDoc.getMap('meta');

  return (
    <div className="flex h-screen flex-col">
      <CursorStyles awareness={awareness} />
      <Toolbar
        docId={id}
        initialName={docName}
        language={language}
        yMeta={yMeta}
        status={status}
        awareness={awareness}
        onLanguage={setLanguage}
        onShare={isOwner ? () => shareRef.current?.showModal() : undefined}
      />
      {status === 'disconnected' && (
        <div className="bg-red-600 px-4 py-1.5 text-center text-xs text-white">
          Connection lost — reconnecting…
        </div>
      )}
      {provider ? (
        <>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1">
            <Editor
              yDoc={yDoc}
              provider={provider}
              undoManager={undoManager}
              language={language}
            />
          </div>
          <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l">
            <div className="max-h-64 shrink-0 overflow-y-auto border-b">
              <VersionPanel docId={id} />
            </div>
            <div className="flex-1 overflow-hidden">
              <AiSidebar docId={id} yDoc={yDoc} />
            </div>
          </aside>
        </div>
        <ShareDialog docId={id} dialogRef={shareRef} />
        </>
      ) : (
        <p className="p-8 text-sm text-muted-foreground">Connecting…</p>
      )}
    </div>
  );
}
