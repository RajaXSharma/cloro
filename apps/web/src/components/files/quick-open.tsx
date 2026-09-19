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
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border bg-background shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            placeholder="Go to file…"
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
            className="w-full bg-transparent py-2 text-sm outline-none"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto py-1 text-sm">
          {matches.map((f, i) => (
            <li key={f.id}>
              <button
                onMouseEnter={() => setIndex(i)}
                onClick={() => choose(f.id)}
                className={`block w-full truncate px-3 py-1 text-left ${
                  i === index ? 'bg-muted' : ''
                }`}
              >
                {f.path}
              </button>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">No matching files.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
