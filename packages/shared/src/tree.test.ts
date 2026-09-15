import { describe, expect, it } from "vitest";
import { extToLanguage, isValidPath, parsePaths, type TreeNode } from "./tree.js";

// flatten to "type:path" lines so ordering assertions stay readable
const flat = (nodes: TreeNode[]): string[] =>
  nodes.flatMap((n) =>
    n.type === "file" ? [`file:${n.path}`] : [`folder:${n.path}`, ...flat(n.children)],
  );

describe("isValidPath", () => {
  it("accepts nested relative paths", () => {
    for (const p of ["a.ts", "src/a.ts", "src/lib/deep/x.ts", "a-b_c.d.ts"]) {
      expect(isValidPath(p)).toBe(true);
    }
  });

  it("rejects escapes, absolute paths and empty segments", () => {
    for (const p of ["", "../x", "a/../b", "src/..", "/abs", "a//b", "a/", "./a", ".."]) {
      expect(isValidPath(p)).toBe(false);
    }
  });

  it("rejects paths over 200 chars", () => {
    expect(isValidPath("a".repeat(201))).toBe(false);
    expect(isValidPath("a".repeat(200))).toBe(true);
  });
});

describe("extToLanguage", () => {
  it("maps known extensions, including deeply nested paths", () => {
    expect(extToLanguage("src/lib/x.ts")).toBe("typescript");
    expect(extToLanguage("a/b/c.py")).toBe("python");
  });

  it("falls back to plaintext", () => {
    expect(extToLanguage("Makefile")).toBe("plaintext");
    expect(extToLanguage("src/weird.xyz")).toBe("plaintext");
  });
});

describe("parsePaths", () => {
  it("nests deeply nested paths and orders folders before files", () => {
    const tree = parsePaths([
      { id: "1", path: "src/lib/x.ts" },
      { id: "2", path: "README.md" },
      { id: "3", path: "src/app.ts" },
      { id: "4", path: "src/lib/deep/y.ts" },
    ]);
    expect(flat(tree)).toEqual([
      "folder:src",
      "folder:src/lib",
      "folder:src/lib/deep",
      "file:src/lib/deep/y.ts",
      "file:src/lib/x.ts",
      "file:src/app.ts",
      "file:README.md",
    ]);
  });

  it("keeps two files in one folder sorted", () => {
    const tree = parsePaths([
      { id: "1", path: "d/b.ts" },
      { id: "2", path: "d/a.ts" },
    ]);
    expect(flat(tree)).toEqual(["folder:d", "file:d/a.ts", "file:d/b.ts"]);
  });

  it("returns [] for no files", () => {
    expect(parsePaths([])).toEqual([]);
  });
});
