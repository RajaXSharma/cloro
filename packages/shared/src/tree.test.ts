import { describe, expect, it } from "vitest";
import {
  extToLanguage,
  isPlaceholder,
  isValidPath,
  isValidSegment,
  joinPath,
  parentOf,
  parsePaths,
  type TreeNode,
} from "./tree.js";

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

describe("isPlaceholder", () => {
  it("hides the folder placeholder wherever it sits", () => {
    expect(isPlaceholder(".gitkeep")).toBe(true);
    expect(isPlaceholder("src/.gitkeep")).toBe(true);
    expect(isPlaceholder("src/lib/deep/.gitkeep")).toBe(true);
  });

  it("leaves real files alone", () => {
    for (const p of ["a.ts", "src/a.ts", "gitkeep", "a.gitkeep", "x/.gitkeep/y.ts"]) {
      expect(isPlaceholder(p)).toBe(false);
    }
  });
});

// Folder-scoped create and name-only folder rename (ADR 003) do their prefix
// arithmetic with these three, so they are the seam the feature is tested at.
describe("path building", () => {
  it("joins a name onto a folder at the root and below it", () => {
    expect(joinPath("", "a.ts")).toBe("a.ts");
    expect(joinPath("src", "a.ts")).toBe("src/a.ts");
    expect(joinPath("src/lib", "a.ts")).toBe("src/lib/a.ts");
  });

  it("drops the last segment to get the parent, root for a top-level path", () => {
    expect(parentOf("src/lib")).toBe("src");
    expect(parentOf("src")).toBe("");
    expect(parentOf("a.ts")).toBe("");
  });

  it("accepts a name as one path segment and rejects separators or dots", () => {
    for (const s of ["a.ts", ".gitkeep", "a-b_c.d.ts"]) expect(isValidSegment(s)).toBe(true);
    for (const s of ["", ".", "..", "a/b", "src/lib"]) expect(isValidSegment(s)).toBe(false);
  });

  it("survives the round trip used by create and rename", () => {
    for (const [parent, name] of [
      ["", "a.ts"],
      ["src", "a.ts"],
      ["src/lib", "deep"],
    ]) {
      expect(parentOf(joinPath(parent, name))).toBe(parent);
    }
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
