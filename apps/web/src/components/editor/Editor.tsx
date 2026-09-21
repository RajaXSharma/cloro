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

/** Must match `editor.background` below and the --background token. */
const EDITOR_BG = '#0b0c0e';

/**
 * Monaco keeps its stock vs-dark syntax highlighting. Token colours are Monaco's
 * own and are deliberately not re-skinned: the code in the editor looks exactly
 * as it always has.
 *
 * Only the chrome around the code is aligned with Cloro's tokens (canvas, gutter,
 * line highlight, caret, selection, widgets, scrollbars), so the editor stops
 * being a lighter island inside a near-black app.
 *
 * EVERY value must be `#`-prefixed. Monaco resolves these through `Color.fromHex`,
 * whose hex parser rejects a value with no leading `#` and then falls back to
 * `Color.red`. A missing hash does not fail loudly, it silently turns the caret,
 * the selection, the line numbers and the current-line highlight pure red.
 */
const THEME: Parameters<Monaco['editor']['defineTheme']>[1] = {
  base: 'vs-dark',
  inherit: true,
  rules: [], // empty on purpose: vs-dark's own token colours apply
  colors: {
    'editor.background': EDITOR_BG,
    'editor.foreground': '#d4d4d4', // vs-dark's default text colour
    'editor.lineHighlightBackground': '#15181c',
    'editor.lineHighlightBorder': '#00000000',
    'editorLineNumber.foreground': '#3a4048',
    'editorLineNumber.activeForeground': '#8b929b',
    'editorCursor.foreground': '#5b9bf8',
    'editor.selectionBackground': '#5b9bf840',
    'editor.inactiveSelectionBackground': '#5b9bf822',
    'editor.selectionHighlightBackground': '#5b9bf826',
    'editorIndentGuide.background1': '#1a1d21',
    'editorIndentGuide.activeBackground1': '#2b3138',
    'editorGutter.background': EDITOR_BG,
    'editorWidget.background': '#15181c',
    'editorWidget.border': '#23272c',
    'editorSuggestWidget.background': '#15181c',
    'editorSuggestWidget.border': '#23272c',
    'editorSuggestWidget.selectedBackground': '#1c2025',
    'editorHoverWidget.background': '#15181c',
    'editorHoverWidget.border': '#23272c',
    'editorBracketMatch.background': '#5b9bf826',
    'editorBracketMatch.border': '#5b9bf880',
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.background': '#23272c80',
    'scrollbarSlider.hoverBackground': '#5a626c80',
    'scrollbarSlider.activeBackground': '#5a626cb0',
    'minimap.background': EDITOR_BG,
  },
};

// A missing '#' is silent and catastrophic (the whole editor chrome turns red), so
// complain loudly in development instead of shipping it twice. Removed from prod.
if (process.env.NODE_ENV !== 'production') {
  for (const [id, value] of Object.entries(THEME.colors)) {
    if (!value || !value.startsWith('#')) {
      console.error(
        `[cloro editor theme] ${id} = ${JSON.stringify(value)} has no leading "#". ` +
          'Monaco resolves that to pure red (#ff0000).',
      );
    }
  }
}

let cachedMono: string | null = null;

/** The UI monospace stack, resolved from the stylesheet once per page load. */
function monoFamily(): string {
  if (cachedMono) return cachedMono;
  if (typeof window === 'undefined') return 'monospace';
  cachedMono =
    getComputedStyle(document.documentElement).getPropertyValue('--font-geist-mono').trim() ||
    'monospace';
  return cachedMono;
}

export function Editor({ yDoc, provider, undoManager, language }: Props) {
  const bindingRef = useRef<MonacoBindingType | null>(null);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [ready, setReady] = useState(false);

  // y-monaco touches `window` at import time, so it is loaded lazily so SSR never
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
      // all four args: third is the editors Set, fourth is awareness
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
      // second effect) can never destroy the same binding twice. y-monaco's
      // destroy() is not idempotent and warns "Tried to remove event handler"
      const binding = bindingRef.current;
      bindingRef.current = null;
      binding?.destroy();
    };
  }, [provider, yDoc, undoManager, ready]);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.editor.defineTheme('cloro-dark', THEME);
    monaco.editor.setTheme('cloro-dark');
    setReady(true); // trigger bind effect (handles either arrival order)
  };

  return (
    // EDITOR_BG matches the theme's canvas color. Monaco is remounted per tab
    // (key={activeId}), so while it re-initialises this wrapper is what shows:
    // paint it editor-dark instead of leaving the page background visible.
    <div className="h-full" style={{ backgroundColor: EDITOR_BG }}>
      <MonacoEditor
        language={language}
        theme="vs-dark"
        loading={null}
        options={{
          fontSize: 13,
          fontFamily: monoFamily(),
          minimap: { enabled: false },
          automaticLayout: true,
          renderLineHighlight: 'line',
          scrollBeyondLastLine: false,
          smoothScrolling: false,
          cursorBlinking: 'solid',
          padding: { top: 12, bottom: 12 },
          scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
          stickyScroll: { enabled: false },
        }}
        onMount={onMount}
      />
    </div>
  );
}
