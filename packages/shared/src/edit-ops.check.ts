// Self-check for §8.2 edit-op logic. Run: pnpm --filter shared check
import assert from "node:assert";
import * as Y from "yjs";
import { validateEdits, applyEdits, DocumentChangedError, type EditOp } from "./edit-ops.js";

// spec example: delete "a" + insert "X" at 5 on "abcdef" → "bcdeXf", not "bcdefX"
const doc = new Y.Doc();
const yText = doc.getText("content");
yText.insert(0, "abcdef");
applyEdits(yText, [
  { op: "delete", range: { start: 0, end: 1 }, text: "" },
  { op: "insert", range: { start: 5, end: 5 }, text: "X" },
]);
assert.strictEqual(yText.toString(), "bcdeXf");

// multi-edit batch: delete + replace in one transaction
const doc2 = new Y.Doc();
const t2 = doc2.getText("content");
t2.insert(0, "hello world");
applyEdits(t2, [
  { op: "replace", range: { start: 0, end: 5 }, text: "goodbye" },
  { op: "delete", range: { start: 6, end: 11 }, text: "" },
]);
assert.strictEqual(t2.toString(), "goodbye ");

// clamping: out-of-range ranges clamp to [0, len]
const ok = validateEdits("abc", [
  { op: "insert", range: { start: 99, end: 99 }, text: "!" },
]);
assert.deepStrictEqual(ok[0].range, { start: 3, end: 3 });

// overlap after sort → DocumentChangedError
assert.throws(
  () =>
    validateEdits("abcdef", [
      { op: "delete", range: { start: 0, end: 4 }, text: "" },
      { op: "replace", range: { start: 2, end: 5 }, text: "x" },
    ]),
  DocumentChangedError,
);

// zero-width inserts at the same offset are not overlaps
validateEdits("abc", [
  { op: "insert", range: { start: 1, end: 1 }, text: "a" },
  { op: "insert", range: { start: 1, end: 1 }, text: "b" },
]);

// empty edit list → nothing to trust
assert.throws(() => validateEdits("abc", []), DocumentChangedError);

console.log("edit-ops checks passed");
