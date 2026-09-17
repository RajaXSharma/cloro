import { describe, expect, it } from "vitest";
import { fuzzyFilter, fuzzyScore } from "./fuzzy.js";

const paths = (files: { path: string }[]) => files.map((f) => f.path);

describe("fuzzyScore", () => {
  it("matches a subsequence, not just a substring", () => {
    expect(fuzzyScore("src/lib/x.ts", "xts")).not.toBeNull();
    expect(fuzzyScore("src/lib/x.ts", "tsx")).toBeNull(); // order matters
  });

  it("is case-insensitive and trims the query", () => {
    expect(fuzzyScore("README.md", "  readme ")).not.toBeNull();
  });
});

describe("fuzzyFilter", () => {
  const files = [
    { path: "vendor/deep/x.ts" },
    { path: "src/x.ts" },
    { path: "src/app.ts" },
  ];

  it("keeps input order for an empty query", () => {
    expect(fuzzyFilter(files, "   ")).toEqual(files);
  });

  it("drops non-matches", () => {
    expect(paths(fuzzyFilter(files, "x"))).toEqual(["src/x.ts", "vendor/deep/x.ts"]);
  });

  it("prefers earlier, shallower matches", () => {
    expect(paths(fuzzyFilter(files, "app"))).toEqual(["src/app.ts"]);
  });
});
