import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { validateEdits, applyEdits, DocumentChangedError, type EditOp } from "./edit-ops.js";

const ins = (start: number, text: string): EditOp => ({
  op: "insert",
  range: { start, end: start },
  text,
});
const del = (start: number, end: number): EditOp => ({ op: "delete", range: { start, end }, text: "" });
const rep = (start: number, end: number, text: string): EditOp => ({ op: "replace", range: { start, end }, text });

describe("applyEdits", () => {
  // spec example: ascending forward order would yield "bcdefX", not "bcdeXf"
  it("applies the §8.2 descending-order example correctly", () => {
    const doc = new Y.Doc();
    const t = doc.getText("content");
    t.insert(0, "abcdef");
    applyEdits(t, [del(0, 1), ins(5, "X")]);
    expect(t.toString()).toBe("bcdeXf");
  });

  it("applies a multi-edit batch (replace + delete) in one pass", () => {
    const doc = new Y.Doc();
    const t = doc.getText("content");
    t.insert(0, "hello world");
    applyEdits(t, [rep(0, 5, "goodbye"), del(6, 11)]);
    expect(t.toString()).toBe("goodbye ");
  });

  it("handles pure inserts at the same offset", () => {
    const doc = new Y.Doc();
    const t = doc.getText("content");
    t.insert(0, "ab");
    applyEdits(t, [ins(1, "1"), ins(1, "2")]);
    expect(t.toString().includes("12") || t.toString().includes("21")).toBe(true);
    expect(t.toString()).toHaveLength(4);
  });
});

describe("validateEdits", () => {
  it("clamps out-of-range ranges (anchor fallback after doc mutation)", () => {
    const ok = validateEdits("abc", [ins(99, "!"), rep(2, 50, "z")]);
    expect(ok[0].range).toEqual({ start: 2, end: 3 }); // rep(2,50) sorts first
    expect(ok[1].range).toEqual({ start: 3, end: 3 });
  });

  it("rejects overlapping ranges after sorting", () => {
    expect(() => validateEdits("abcdef", [del(0, 4), rep(2, 5, "x")])).toThrow(DocumentChangedError);
  });

  it("allows zero-width inserts at the same offset", () => {
    expect(() => validateEdits("abc", [ins(1, "a"), ins(1, "b")])).not.toThrow();
  });

  it("rejects an empty edit list", () => {
    expect(() => validateEdits("abc", [])).toThrow(DocumentChangedError);
  });

  it("clamps end below start to a zero-width range", () => {
    const ok = validateEdits("abcdef", [del(5, 2)]);
    expect(ok[0].range).toEqual({ start: 5, end: 5 });
  });
});
