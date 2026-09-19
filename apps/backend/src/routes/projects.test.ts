import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import AdmZip from "adm-zip";

// The route is the only place the export rules live (which rows are files, what an
// empty project answers, what the download is called), so it is tested here with the
// DB and the file reader stubbed — no Postgres, and no Yjs document to build.
vi.mock("../db.js", () => ({
  pool: { connect: vi.fn() },
  query: vi.fn(),
  isUuid: () => true,
  projectOfFile: vi.fn(),
  isFileMember: vi.fn(),
  isProjectMember: vi.fn(),
  projectOwner: vi.fn(),
}));

vi.mock("../files/text.js", () => ({ getFileText: vi.fn() }));

// the real middleware is covered in auth.test.ts; here we only need a signed-in user
vi.mock("../auth.js", () => ({
  verifyToken: vi.fn(),
  requireAuth: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { id: "user-1", email: "t@x.com", name: "T" };
    next();
  },
}));

import { isProjectMember, query } from "../db.js";
import { getFileText } from "../files/text.js";
import { createApp } from "../http.js";

const queryMock = vi.mocked(query);
const isProjectMemberMock = vi.mocked(isProjectMember);
const getFileTextMock = vi.mocked(getFileText);

const PID = "3f1a2b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b";

const texts: Record<string, string> = {
  "a.ts": "export const a = 1;\n",
  "b.md": "# b\n",
};

/** What the export query + reader return for a project of these files. */
function stubProject(files: { id: string; path: string }[], projectName = "My Project!") {
  const rows = files.map((f) => ({ ...f, project_name: projectName }));
  queryMock.mockResolvedValue({ rows } as never);

  const paths = new Map(files.map((f) => [f.id, f.path]));
  getFileTextMock.mockImplementation(async (id: string) => ({
    path: paths.get(id)!,
    text: texts[paths.get(id)!] ?? "",
  }));
}

let server: Server;
let base: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

const exportZip = () => fetch(`${base}/projects/${PID}/export`);
const unzip = async (res: Response) => new AdmZip(Buffer.from(await res.arrayBuffer()));

beforeEach(() => {
  vi.clearAllMocks();
  isProjectMemberMock.mockResolvedValue(true);
});

describe("GET /projects/:pid/export", () => {
  it("zips the file rows at the archive root, hiding the folder placeholder", async () => {
    stubProject([
      { id: "f1", path: "a.ts" },
      { id: "f2", path: "src/.gitkeep" },
      { id: "f3", path: "b.md" },
    ]);

    const res = await exportZip();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="my-project.zip"',
    );

    const zip = await unzip(res);
    expect(zip.getEntries().map((e) => e.entryName)).toEqual(["a.ts", "b.md"]);
    for (const name of ["a.ts", "b.md"]) {
      expect(zip.readAsText(name)).toBe(texts[name]);
    }
  });

  it("names each entry from the same read that produced its text", async () => {
    stubProject([{ id: "f1", path: "old.ts" }]);
    // renamed between the list query and the content read
    getFileTextMock.mockResolvedValue({ path: "new.ts", text: "x" });

    const zip = await unzip(await exportZip());

    expect(zip.getEntries().map((e) => e.entryName)).toEqual(["new.ts"]);
  });

  it("answers 400 for a project with no files", async () => {
    queryMock.mockResolvedValue({ rows: [] } as never);

    const res = await exportZip();

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "project has no files" });
  });

  it("answers 400 when every row is only a folder placeholder", async () => {
    stubProject([{ id: "f1", path: "src/.gitkeep" }]);

    const res = await exportZip();

    expect(res.status).toBe(400);
    expect(getFileTextMock).not.toHaveBeenCalled();
  });

  it("refuses a non-member without reading the project's files", async () => {
    isProjectMemberMock.mockResolvedValue(false);

    const res = await exportZip();

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "forbidden" });
    expect(queryMock).not.toHaveBeenCalled();
  });
});
