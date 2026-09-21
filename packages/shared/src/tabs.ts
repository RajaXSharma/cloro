/**
 * Tabs are ids into the live file list, which can change without the tab owner
 * knowing: a collaborator deletes a file, the roster map sync drops it from
 * `files`, and the local delete handler never runs. Left alone the tab lingers
 * and the UI falls back to showing the raw id. Reconcile the two, returning the
 * vanished ids so the caller can also tear down their editor sessions.
 */
export function pruneTabs(
  openIds: string[],
  activeId: string | null,
  existingIds: string[],
): { openIds: string[]; activeId: string | null; removed: string[] } {
  const present = new Set(existingIds);
  const removed = openIds.filter((id) => !present.has(id));
  if (removed.length === 0) return { openIds, activeId, removed };
  const next = openIds.filter((id) => present.has(id));
  return {
    openIds: next,
    activeId: activeId && present.has(activeId) ? activeId : (next[next.length - 1] ?? null),
    removed,
  };
}
