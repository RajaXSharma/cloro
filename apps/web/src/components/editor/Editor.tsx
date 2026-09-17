'use client';

import { useEffect, useRef, useState } from 'react';
import MonacoEditor, { type Monaco, type OnMount } from '@monaco-editor/react';
import type { MonacoBinding as MonacoBindingType } from 'y-monaco';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type * as Y from 'yjs';
import type { UndoManager } from 'yjs';

interface Props {
  yDoc: Y.Doc;
  provider: HocuspocusProvider;
  undoManager: UndoManager;
  language: string;
}

const EDITOR_BG = '#1e1e1e'; // monaco vs-dark background

export function Editor({ yDoc, provider, undoManager, language }: Props) {
  const bindingRef = useRef<MonacoBindingType | null>(null);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [ready, setReady] = useState(false);

  // y-monaco touches `window` at import time — load it lazily so SSR never
  // evaluates it. Effect deps handle either arrival order (provider state vs
  // onMount's setReady); onMount alone triggers it, the effect never does.
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !model || !monaco) return;

    let cancelled = false;
    void import('y-monaco').then(({ MonacoBinding }) => {
      if (cancelled) return;
      // all four args — third is the editors Set, fourth is awareness
      bindingRef.current = new MonacoBinding(
        yDoc.getText('content'),
        model,
        new Set([editor]),
        provider.awareness,
      );
      // MonacoBinding has no undo param; without these, Ctrl+Z hits Monaco's
      // native stack which knows nothing about Yjs.
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => undoManager.undo());
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, () => undoManager.redo());
    });
    return () => {
      cancelled = true;
      // clear before destroy: one owner, so an extra cleanup (StrictMode, a
      // second effect) can never destroy the same binding twice — y-monaco's
      // destroy() is not idempotent and warns "Tried to remove event handler"
      const binding = bindingRef.current;
      bindingRef.current = null;
      binding?.destroy();
    };
  }, [provider, yDoc, undoManager, ready]);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setReady(true); // trigger bind effect (handles either arrival order)
  };

  return (
    // vs-dark's canvas colour. Monaco is remounted per tab (key={activeId}), so
    // while it re-initialises this wrapper is what shows — paint it editor-dark
    // instead of leaving the page's white visible behind it.
    <div className="h-full" style={{ backgroundColor: EDITOR_BG }}>
      <MonacoEditor
        language={language}
        theme="vs-dark"
        loading={null}
        options={{ fontSize: 14, minimap: { enabled: false }, automaticLayout: true }}
        onMount={onMount}
      />
    </div>
  );
}
