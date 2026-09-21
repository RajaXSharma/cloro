'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import type * as Y from 'yjs';
import { api } from '@/lib/api/client';
import { applyEdits, validateEdits, DocumentChangedError, type EditOp } from 'shared';
import { SettingsDialog } from '@/components/ai/settings-dialog';
import { Textarea } from '@/components/ui/field';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const initial = (path: string): Msg[] => [
  {
    role: 'assistant',
    content: `Ask about ${path}, or switch to Edit to change it.`,
  },
];

type Mode = 'ask' | 'edit';

export function AiSidebar({ fileId, path, yDoc }: { fileId: string; path: string; yDoc: Y.Doc }) {
  const [messages, setMessages] = useState<Msg[]>(() => initial(path));
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('ask');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const settingsRef = useRef<HTMLDialogElement>(null);
  // the page mounts this with key={fileId}, so unmount == the active tab changed.
  // Re-set on mount: StrictMode's spurious mount/cleanup/mount would otherwise
  // leave this false forever and silently discard every apply.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

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
        body: JSON.stringify({ documentId: fileId, question }),
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

  // Edit mode: the same send button, routed to structured edits instead of chat
  async function apply(instruction: string) {
    push({ role: 'user', content: instruction });
    push({ role: 'assistant', content: '' });
    setBusy(true);
    try {
      const res = await api('/ai/apply', {
        method: 'POST',
        body: JSON.stringify({ documentId: fileId, instruction }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'AI request failed. Try again.' }));
        appendLast(error);
        return;
      }
      const { edits } = (await res.json()) as { edits: EditOp[] };
      // tab switched while the model was thinking: drop the ops rather than
      // edit a file the user is no longer looking at
      if (!alive.current) return;
      const yText = yDoc.getText('content');
      try {
        const valid = validateEdits(yText.toString(), edits);
        yDoc.transact(() => applyEdits(yText, valid), 'ai-apply');
        appendLast(`Applied ${valid.length} edit(s).`);
      } catch (e) {
        if (e instanceof DocumentChangedError)
          appendLast('Document changed since the AI saw it. Ask again.');
        else throw e;
      }
    } finally {
      setBusy(false);
    }
  }

  /** One send button, routed by the Ask/Edit toggle beside it. */
  function send(text: string) {
    return mode === 'edit' ? apply(text) : ask(text);
  }

  async function onSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    await send(text);
  }

  function sendOnEnter(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    void send(text);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
        <span className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          AI Assistant
        </span>
        <button
          type="button"
          onClick={() => settingsRef.current?.showModal()}
          className="rounded-sm text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Settings
        </button>
      </div>

      <ul ref={listRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <li
            key={i}
            className={
              m.role === 'user'
                ? 'self-end rounded-md bg-primary px-2.5 py-1.5 text-xs leading-relaxed text-primary-foreground'
                : 'self-start rounded-md bg-secondary px-2.5 py-1.5 text-xs leading-relaxed whitespace-pre-wrap text-secondary-foreground'
            }
          >
            {m.content || <span className="animate-pulse text-muted-foreground">Thinking…</span>}
          </li>
        ))}
      </ul>

      <form onSubmit={onSubmit} className="flex shrink-0 flex-col gap-2 border-t p-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'edit' ? 'Describe an edit…' : 'Ask a question…'}
          aria-label={mode === 'edit' ? 'Describe an edit' : 'Ask a question'}
          rows={2}
          onKeyDown={sendOnEnter}
          className="resize-none text-xs"
        />
        <div className="flex items-center justify-between gap-2">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            aria-label="AI mode"
            title="Ask a question, or apply an edit"
            className="rounded-md border border-input bg-secondary/40 px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <option value="ask">Ask</option>
            <option value="edit">Edit</option>
          </select>
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            title="Send"
            className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
        </div>
      </form>

      <SettingsDialog dialogRef={settingsRef} />
    </div>
  );
}
