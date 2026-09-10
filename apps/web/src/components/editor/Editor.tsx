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

export function Editor({ yDoc, provider, undoManager, language }: Props) {
  const bindingRef = useRef<MonacoBindingType | null>(null);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => () => bindingRef.current?.destroy(), []);

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
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [provider, yDoc, undoManager, ready]);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setReady(true); // trigger bind effect (handles either arrival order)
  };

  return (
    <div className="h-full">
      <MonacoEditor
        language={language}
        theme="vs-dark"
        options={{ fontSize: 14, minimap: { enabled: false }, automaticLayout: true }}
        onMount={onMount}
      />
    </div>
  );
}
