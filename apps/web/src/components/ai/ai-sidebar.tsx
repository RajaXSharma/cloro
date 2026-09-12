'use client';

import { useRef, useState } from 'react';
import type * as Y from 'yjs';
import { api } from '@/lib/api/client';
import { applyEdits, validateEdits, DocumentChangedError, type EditOp } from 'shared';
import { SettingsDialog } from '@/components/ai/settings-dialog';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const initial = (): Msg[] => [
  { role: 'assistant', content: 'Ask about this document, or type an edit instruction and press Apply.' },
];

export function AiSidebar({ docId, yDoc }: { docId: string; yDoc: Y.Doc }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const settingsRef = useRef<HTMLDialogElement>(null);

  function scroll() {
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
  }

  function push(msg: Msg) {
    setMessages((m) => [...m, msg]);
    scroll();
  }

  // append to the last assistant bubble (streaming deltas)
  function appendLast(text: string) {
    setMessages((m) => [...m.slice(0, -1), { role: 'assistant', content: m[m.length - 1].content + text }]);
    scroll();
  }

  async function ask(question: string) {
    push({ role: 'user', content: question });
    push({ role: 'assistant', content: '' });
    setBusy(true);
    try {
      const res = await api('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ documentId: docId, question }),
      });
      if (!res.ok || !res.body) {
        const { error } = await res.json().catch(() => ({ error: 'AI request failed' }));
        appendLast(` (${error})`);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const events = buf.split('\n\n');
        buf = events.pop() ?? '';
        for (const ev of events) {
          const payload = ev.replace(/^data: ?/, '').trim();
          if (!payload || payload === '[DONE]') continue;
          const { delta, error } = JSON.parse(payload);
          if (error) appendLast(` (${error})`);
          else if (delta) appendLast(delta);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function apply(instruction: string) {
    push({ role: 'user', content: `[apply] ${instruction}` });
    push({ role: 'assistant', content: '' });
    setBusy(true);
    try {
      const res = await api('/ai/apply', {
        method: 'POST',
        body: JSON.stringify({ documentId: docId, instruction }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'AI request failed — try again.' }));
        appendLast(error);
        return;
      }
      const { edits } = (await res.json()) as { edits: EditOp[] };
      const yText = yDoc.getText('content');
      try {
        const valid = validateEdits(yText.toString(), edits);
        yDoc.transact(() => applyEdits(yText, valid), 'ai-apply');
        appendLast(`Applied ${valid.length} edit(s).`);
      } catch (e) {
        if (e instanceof DocumentChangedError)
          appendLast('Document changed since the AI saw it — ask again.');
        else throw e;
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    await ask(text);
  }

  async function onApply() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    await apply(text);
  }

  return (
    <div className="flex h-full flex-col text-sm">
      <span className="flex items-center justify-between border-b px-3 py-2 font-medium">
        AI Assistant
        <button
          type="button"
          onClick={() => settingsRef.current?.showModal()}
          className="text-xs font-normal text-muted-foreground hover:underline"
        >
          Settings
        </button>
      </span>
      <ul ref={listRef} className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <li
            key={i}
            className={
              m.role === 'user'
                ? 'self-end rounded-lg bg-primary px-2 py-1 text-primary-foreground'
                : 'self-start rounded-lg bg-muted px-2 py-1 whitespace-pre-wrap'
            }
          >
            {m.content || (
              <span className="animate-pulse text-muted-foreground">Thinking…</span>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="flex flex-col gap-2 border-t p-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question or describe an edit…"
          rows={2}
          className="resize-none rounded-md border bg-background px-2 py-1"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onApply}
            disabled={busy || !input.trim()}
            className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
          >
            Apply edits
          </button>
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </form>
      <SettingsDialog dialogRef={settingsRef} />
    </div>
  );
}
