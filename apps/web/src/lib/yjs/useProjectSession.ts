'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { Awareness } from 'y-protocols/awareness';
import { extToLanguage } from 'shared';
import { fetchToken } from '@/lib/api/client';
import { getProject, listFiles, type Project, type ProjectFile } from '@/lib/api/projects';
import { hashColor, type CollabStatus, type CollabUser } from '@/lib/yjs/useYDoc';

const WS_URL = process.env.NEXT_PUBLIC_HOCUSPUS_URL ?? 'ws://localhost:1234';

export interface FileSession {
  yDoc: Y.Doc;
  provider: HocuspocusProvider;
  undoManager: Y.UndoManager;
}

/**
 * Project-level state: the file list plus one collab session per open file, and
 * one roster session for the whole project (`roster:<projectId>`).
 *
 * File sessions live in a ref (not state) — opening a tab also changes `openIds`
 * in the page, which is what re-renders. They are created on demand and destroyed
 * only when the tab closes or the project unmounts, so switching tabs never
 * reconnects or reloads a doc.
 *
 * The roster doc is the live mirror of the tree (Postgres is authoritative): every
 * REST file op refreshes the list and publishes it into the map, and map changes
 * from peers are merged straight into `files` — no refetch needed. A refetch on
 * window focus repairs any divergence.
 */
export function useProjectSession(projectId: string, activeId: string | null = null) {
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<CollabStatus>('connecting');
  const [rosterAwareness, setRosterAwareness] = useState<Awareness | null>(null);
  const [rosterStatus, setRosterStatus] = useState<CollabStatus>('connecting');

  const sessions = useRef(new Map<string, FileSession>());
  const user = useRef<CollabUser | null>(null);
  const rosterDoc = useRef<Y.Doc | null>(null);
  const rosterProvider = useRef<HocuspocusProvider | null>(null);
  const rosterSynced = useRef(false);

  /** Merge the roster map into `files`; unchanged rows keep their DB language. */
  const applyRoster = useCallback((map: Y.Map<string>) => {
    setFiles((prev) => {
      // before the first sync the map is empty — keep the REST list we already have
      if (!rosterSynced.current && map.size === 0 && prev.length > 0) return prev;
      const before = new Map(prev.map((f) => [f.id, f]));
      const next: ProjectFile[] = [];
      map.forEach((path, id) => {
        const old = before.get(id);
        next.push(
          old && old.path === path
            ? old
            : { id, path, language: extToLanguage(path), updated_at: old?.updated_at ?? '' },
        );
      });
      next.sort((a, b) => a.path.localeCompare(b.path));
      return next;
    });
  }, []);

  /** REST result → roster map, so peers see the tree change without refetching. */
  const publish = useCallback((list: ProjectFile[]) => {
    const doc = rosterDoc.current;
    const map = doc?.getMap<string>('files');
    if (!doc || !map) return;
    const ids = new Set(list.map((f) => f.id));
    doc.transact(() => {
      for (const key of [...map.keys()]) if (!ids.has(key)) map.delete(key);
      for (const f of list) map.set(f.id, f.path);
    });
  }, []);

  const refresh = useCallback(async () => {
    const list = await listFiles(projectId);
    setFiles(list);
    publish(list);
  }, [projectId, publish]);

  useEffect(() => {
    let alive = true;
    Promise.all([getProject(projectId), refresh()])
      .then(([p]) => {
        if (alive) setProject(p);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'failed'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [projectId, refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((s: { user?: { name?: string; email?: string } } | null) => {
        if (!s?.user) return;
        const name = s.user.name ?? s.user.email ?? 'anon';
        user.current = { name, color: hashColor(s.user.email ?? name) };
        for (const session of sessions.current.values()) {
          session.provider.awareness?.setLocalStateField('user', user.current);
        }
        rosterProvider.current?.awareness?.setLocalStateField('user', user.current);
      });
  }, []);

  // one roster provider per project (never per tab — it carries project presence)
  useEffect(() => {
    const doc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: WS_URL,
      name: `roster:${projectId}`,
      document: doc,
      token: fetchToken,
    });
    rosterDoc.current = doc;
    rosterProvider.current = provider;
    rosterSynced.current = false;

    const map = doc.getMap<string>('files');
    const onMap = () => applyRoster(map);
    const onStatus = ({ status }: { status: CollabStatus }) => setRosterStatus(status);
    const onSynced = () => {
      rosterSynced.current = true;
      if (user.current) provider.awareness?.setLocalStateField('user', user.current);
      applyRoster(map);
    };
    map.observe(onMap);
    provider.on('status', onStatus);
    provider.on('synced', onSynced);
    setRosterAwareness(provider.awareness ?? null);

    return () => {
      map.unobserve(onMap);
      provider.off('status', onStatus);
      provider.off('synced', onSynced);
      provider.destroy();
      doc.destroy();
      rosterDoc.current = null;
      rosterProvider.current = null;
      setRosterAwareness(null);
      setRosterStatus('connecting');
    };
  }, [projectId, applyRoster]);

  const open = useCallback((fileId: string) => {
    if (sessions.current.has(fileId)) return;
    const yDoc = new Y.Doc();
    // One manager per file, created here and destroyed in close() — never in an
    // effect cleanup. StrictMode's spurious cleanup would destroy it and Ctrl+Z
    // would then silently stop tracking new transactions.
    const undoManager = new Y.UndoManager(yDoc.getText('content'), {
      captureTimeout: 500,
      // 'ai-apply' is used by the AI sidebar (P9) so its edits are undoable too
      trackedOrigins: new Set([null, 'ai-apply']),
    });
    const provider = new HocuspocusProvider({
      url: WS_URL,
      name: fileId,
      document: yDoc,
      token: fetchToken,
    });
    if (user.current) provider.awareness?.setLocalStateField('user', user.current);
    sessions.current.set(fileId, { yDoc, provider, undoManager });
  }, []);

  const close = useCallback((fileId: string) => {
    const session = sessions.current.get(fileId);
    if (!session) return;
    sessions.current.delete(fileId);
    session.undoManager.destroy();
    session.provider.destroy();
    session.yDoc.destroy();
  }, []);

  const getSession = useCallback((fileId: string) => sessions.current.get(fileId) ?? null, []);

  // which file this client has open, broadcast to peers on the roster doc
  useEffect(() => {
    rosterAwareness?.setLocalStateField('openFile', activeId);
  }, [activeId, rosterAwareness]);

  // status of the tab in front; background tabs keep syncing behind the scenes
  useEffect(() => {
    const session = activeId ? sessions.current.get(activeId) : null;
    if (!session) return;
    const onStatus = ({ status }: { status: CollabStatus }) => setStatus(status);
    session.provider.on('status', onStatus);
    setStatus('connecting');
    return () => {
      session.provider.off('status', onStatus);
    };
  }, [activeId]);

  // real unmount or project change: drop every provider
  useEffect(() => {
    const all = sessions.current;
    return () => {
      for (const session of all.values()) {
        session.undoManager.destroy();
        session.provider.destroy();
        session.yDoc.destroy();
      }
      all.clear();
    };
  }, [projectId]);

  return {
    project,
    files,
    loading,
    error,
    refresh,
    status,
    rosterStatus,
    rosterAwareness,
    open,
    close,
    getSession,
  };
}
