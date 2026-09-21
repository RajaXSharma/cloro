// Quick-open ranking. A query matches when its characters appear in order in the
// path (subsequence, case-insensitive); matches in the basename and adjacent runs
// score higher, shorter paths break ties. Deliberately not a full fuzzy matcher:
// enough to put `src/x.ts` above `vendor/deep/x.ts` for "x".

/** Score for one path, or null when the query is not a subsequence of it. */
export function fuzzyScore(path: string, query: string): number | null {
  const p = path.toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const baseStart = p.lastIndexOf("/") + 1;
  let score = 0;
  let cursor = 0;
  let streak = 0;

  for (const ch of q) {
    const hit = p.indexOf(ch, cursor);
    if (hit === -1) return null;
    streak = hit === cursor ? streak + 1 : 0;
    score += 1 + streak + (hit >= baseStart ? 2 : 0) - (hit - cursor) * 0.1;
    cursor = hit + 1;
  }
  return score - p.length * 0.01;
}

/** Items whose `path` subsequence-matches `query`, best first; empty query keeps input order. */
export function fuzzyFilter<T extends { path: string }>(items: T[], query: string): T[] {
  if (!query.trim()) return [...items];
  return items
    .map((item) => ({ item, score: fuzzyScore(item.path, query) }))
    .filter((m): m is { item: T; score: number } => m.score !== null)
    .sort((a, b) => b.score - a.score)
    .map((m) => m.item);
}
