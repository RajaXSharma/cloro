'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { fuzzyFilter, isPlaceholder } from 'shared';
import type { ProjectFile } from '@/lib/api/projects';

/** Ctrl/Cmd+P fuzzy file palette. Registers its own shortcut; renders nothing when closed. */
export function QuickOpen({
  files,
  onOpen,
}: {
  files: ProjectFile[];
  onOpen: (fileId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // capture phase: Monaco swallows Ctrl/Cmd+P before it bubbles to window
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setQuery('');
        setIndex(0);
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const matches = fuzzyFilter(
    files.filter((f) => !isPlaceholder(f.path)),
    query,
  ).slice(0, 50);
  const choose = (id: string) => {
    setOpen(false);
    onOpen(id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Go to file"
        className="w-full max-w-lg overflow-hidden rounded-lg border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            placeholder="Go to file…"
            role="combobox"
            aria-label="Go to file"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls="quick-open-results"
            aria-activedescendant={matches[index] ? `quick-open-${matches[index].id}` : undefined}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, matches.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              }
              if (e.key === 'Enter' && matches[index]) choose(matches[index].id);
            }}
            className="w-full bg-transparent py-2.5 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <ul id="quick-open-results" role="listbox" aria-label="Files" className="max-h-72 overflow-y-auto py-1">
          {matches.map((f, i) => (
            <li key={f.id} id={`quick-open-${f.id}`} role="option" aria-selected={i === index}>
              <button
                onMouseEnter={() => setIndex(i)}
                onClick={() => choose(f.id)}
                className={`block w-full truncate px-3 py-1.5 text-left font-mono text-xs transition-colors ${
                  i === index ? 'bg-secondary/60 text-foreground' : 'text-muted-foreground'
                }`}
              >
                {f.path}
              </button>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="px-3 py-3 text-xs text-muted-foreground">No matching files.</li>
          )}
        </ul>

        <div className="flex items-center gap-3 border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded-sm border px-1 font-mono">↑</kbd>
            <kbd className="rounded-sm border px-1 font-mono">↓</kbd>
            to move
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded-sm border px-1 font-mono">Enter</kbd>
            to open
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="rounded-sm border px-1 font-mono">Esc</kbd>
            to close
          </span>
        </div>
      </div>
    </div>
  );
}
