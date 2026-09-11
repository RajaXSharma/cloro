import { z } from "zod";

export const RangeSchema = z.object({
  start: z.number().int().min(0),
  end: z.number().int().min(0),
});

export const EditOpSchema = z.object({
  op: z.enum(["insert", "delete", "replace"]),
  range: RangeSchema,
  text: z.string(),
});

export const EditOpsSchema = z.object({ edits: z.array(EditOpSchema).min(1) });

export type EditOp = z.infer<typeof EditOpSchema>;
export type EditOps = z.infer<typeof EditOpsSchema>;

// Structural slice of Y.Text — keeps yjs out of this package's deps.
export interface YTextLike {
  insert(index: number, text: string): void;
  delete(index: number, length: number): void;
}

/** Ranges don't match the current document (a peer edited since the AI saw it). */
export class DocumentChangedError extends Error {}

/**
 * Client-side re-validation against the CURRENT doc text:
 * clamp ranges into bounds, sort by start, reject overlaps.
 */
export function validateEdits(text: string, edits: EditOp[]): EditOp[] {
  if (edits.length === 0) throw new DocumentChangedError();
  const len = text.length;
  const clamped = edits.map((e) => {
    const start = Math.min(Math.max(e.range.start, 0), len);
    return { ...e, range: { start, end: Math.min(Math.max(e.range.end, start), len) } };
  });
  const sorted = clamped.sort((a, b) => a.range.start - b.range.start);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].range.start < sorted[i - 1].range.end) throw new DocumentChangedError();
  }
  return sorted;
}

// DESCENDING start order: each applied edit shifts offsets at/after its start,
// so every unapplied edit must sit below the shift. (Ascending forward order
// misplaces text: delete "a" + insert "X" at 5 on "abcdef" yields "bcdefX",
// not "bcdeXf".)
export function applyEdits(yText: YTextLike, edits: EditOp[]) {
  for (const e of edits.slice().sort((a, b) => b.range.start - a.range.start)) {
    const { start, end } = e.range;
    if (start === end) yText.insert(start, e.text);
    else if (e.text === "") yText.delete(start, end - start);
    else {
      yText.delete(start, end - start);
      yText.insert(start, e.text);
    }
  }
}
