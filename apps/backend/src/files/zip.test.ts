import AdmZip from "adm-zip";
import { describe, expect, it } from "vitest";
import { createZip, type ZipEntry } from "./zip.js";

const entries: ZipEntry[] = [
  { name: "README.md", text: "# cloro\n" },
  { name: "src/lib/x.ts", text: "export const x = 1;\n" },
  { name: "empty.txt", text: "" },
  { name: "日本語.txt", text: "こんにちは\n" },
  // large enough to span many zlib chunks, so a premature resolve shows up
  { name: "big.txt", text: "lorem ipsum dolor sit amet ".repeat(10_000) },
];

describe("createZip", () => {
  it("round-trips every entry with its exact bytes", async () => {
    const zip = await createZip(entries);

    expect(zip.subarray(0, 2).toString("latin1")).toBe("PK");

    const read = new AdmZip(zip);
    expect(read.getEntries().map((e) => e.entryName)).toEqual(entries.map((e) => e.name));
    for (const entry of entries) {
      expect(read.readAsText(entry.name)).toBe(entry.text);
    }
  });

  it("produces a valid, empty archive for no entries", async () => {
    expect(new AdmZip(await createZip([])).getEntries()).toHaveLength(0);
  });
});
