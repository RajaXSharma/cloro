import { describe, expect, it } from "vitest";
import { zipFilename } from "./zip";

describe("zipFilename", () => {
  it("slugs the project name", () => {
    expect(zipFilename("Cloro Demo 2!")).toBe("cloro-demo-2.zip");
    expect(zipFilename("  src/lib  ")).toBe("src-lib.zip");
    expect(zipFilename("a--b")).toBe("a-b.zip");
  });

  it("falls back and stays a legal filename", () => {
    for (const empty of ["", "   ", "日本語", "///"]) {
      expect(zipFilename(empty)).toBe("project.zip");
    }
    const long = zipFilename("x".repeat(200) + " tail");
    expect(long).toBe(`${"x".repeat(60)}.zip`);
    expect(long).not.toMatch(/-\.zip$/);
  });
});
