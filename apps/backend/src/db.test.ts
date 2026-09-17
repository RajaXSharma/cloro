import { describe, expect, it } from "vitest";
import {
  isFileMember,
  isProjectMember,
  isUuid,
  projectOfFile,
  projectOwner,
} from "./db.js";

const UUID = "3f1a2b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b";

describe("isUuid", () => {
  it("accepts canonical uuids", () => {
    expect(isUuid(UUID)).toBe(true);
    expect(isUuid(UUID.toUpperCase())).toBe(true);
  });

  it("rejects anything else", () => {
    for (const s of ["", "nope", "roster:x", UUID.slice(0, -1), `${UUID}0`, "1"]) {
      expect(isUuid(s)).toBe(false);
    }
  });
});

// Regression: a non-uuid id used to reach a `uuid` column, where Postgres raised
// 22P02 and Express turned it into a 500 (POST /ai/chat {"documentId":"nope"}).
// The guards must resolve before any query — no DATABASE_URL is set here, so a
// query would fail the test rather than pass it.
describe("uuid guards answer without querying postgres", () => {
  it("reports not-found / not-a-member for malformed ids", async () => {
    expect(await projectOfFile("nope")).toBeNull();
    expect(await projectOwner("nope")).toBeNull();
    expect(await isFileMember("nope", "also-not-a-uuid")).toBe(false);
    expect(await isProjectMember("nope", "also-not-a-uuid")).toBe(false);
  });

  it("rejects a malformed user id even with a valid file id", async () => {
    expect(await isFileMember(UUID, "nope")).toBe(false);
    expect(await isProjectMember(UUID, "nope")).toBe(false);
  });
});
