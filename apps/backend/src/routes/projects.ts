import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { PathSchema, extToLanguage, isPlaceholder, zipFilename } from "shared";
import { isProjectMember, pool, projectOwner, query, isUuid } from "../db.js";
import { getFileText } from "../files/text.js";
import { createZip } from "../files/zip.js";

type PidReq = Request<{ pid: string }>;
type FidReq = Request<{ fid: string }>;

const createSchema = z.object({
  name: z.string().min(1),
  files: z.array(z.object({ path: PathSchema })).optional(),
});
const updateFileSchema = z.object({
  path: PathSchema.optional(),
  language: z.string().min(1).optional(),
});
const createFileSchema = z.object({
  path: PathSchema,
  language: z.string().min(1).optional(),
});
const renameProjectSchema = z.object({ name: z.string().min(1) });

async function requireMember(projectId: string, userId: string, res: Response) {
  if (await isProjectMember(projectId, userId)) return true;
  res.status(403).json({ error: "forbidden" });
  return false;
}

// shared by PATCH/DELETE /files/:fid — resolves the file and checks membership,
// writing the error response itself and returning null when it refuses
async function fileForMember(fid: string, userId: string, res: Response) {
  if (!isUuid(fid)) {
    res.status(404).json({ error: "file not found" });
    return null;
  }
  const { rows } = await query("select project_id, path from files where id = $1", [fid]);
  if (!rows[0]) {
    res.status(404).json({ error: "file not found" });
    return null;
  }
  if (!(await isProjectMember(rows[0].project_id, userId))) {
    res.status(403).json({ error: "forbidden" });
    return null;
  }
  return rows[0] as { project_id: string; path: string };
}

const isDuplicatePath = (err: unknown) => (err as { code?: string }).code === "23505";

// One rule for both deletes: a row is removed when its path IS the target or sits
// under it (`src` takes `src/lib/x.ts`). That is what makes a folder deletable —
// folders are path prefixes, never rows.
async function deleteSubtree(projectId: string, path: string) {
  const { rows } = await query(
    `delete from files where project_id = $1
       and (path = $2 or starts_with(path, $2 || '/')) returning id`,
    [projectId, path],
  );
  return rows.map((r) => r.id);
}

export const projectsRouter = Router();

// Any project member (owner or editor) may create/rename/delete files;
// owner-only is reserved for project PATCH/DELETE and collaborator invites.

projectsRouter.get("/", async (req, res) => {
  const { rows } = await query(
    `select p.id, p.name, p.owner_id, p.created_at, (p.owner_id = $1) as is_owner,
       count(f.id)::int as file_count,
       coalesce(max(f.updated_at), p.created_at) as updated_at
     from projects p
     left join files f on f.project_id = p.id
     where p.owner_id = $1
        or exists (select 1 from project_collaborators c
                   where c.project_id = p.id and c.user_id = $1)
     group by p.id
     order by updated_at desc`,
    [req.user!.id],
  );
  res.json(rows);
});

projectsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid fields" });

  const { name, files = [] } = parsed.data;
  const paths = files.map((f) => f.path);
  if (new Set(paths).size !== paths.length)
    return res.status(409).json({ error: "duplicate path in files" });

  // a project is its files — don't leave a half-seeded project behind
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query(
      `insert into projects (name, owner_id) values ($1, $2)
       returning id, name, owner_id, created_at`,
      [name, req.user!.id],
    );
    for (const path of paths) {
      await client.query(
        "insert into files (project_id, path, language) values ($1, $2, $3)",
        [rows[0].id, path, extToLanguage(path)],
      );
    }
    await client.query("commit");
    res.status(201).json({ ...rows[0], file_count: paths.length });
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
});

projectsRouter.get("/:pid", async (req: PidReq, res) => {
  if (!(await requireMember(req.params.pid, req.user!.id, res))) return;
  const { rows } = await query(
    `select p.id, p.name, p.owner_id, p.created_at, (p.owner_id = $2) as is_owner,
       (select count(*)::int from files f where f.project_id = p.id) as file_count
     from projects p where p.id = $1`,
    [req.params.pid, req.user!.id],
  );
  res.json(rows[0]);
});

projectsRouter.patch("/:pid", async (req: PidReq, res) => {
  const parsed = renameProjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid fields" });

  const ownerId = await projectOwner(req.params.pid);
  if (ownerId !== req.user!.id)
    return res.status(403).json({ error: "forbidden" });

  const { rows } = await query(
    "update projects set name = $1 where id = $2 returning id, name, owner_id, created_at",
    [parsed.data.name, req.params.pid],
  );
  res.json(rows[0]);
});

projectsRouter.delete("/:pid", async (req: PidReq, res) => {
  const ownerId = await projectOwner(req.params.pid);
  if (ownerId !== req.user!.id)
    return res.status(403).json({ error: "forbidden" });

  await query("delete from projects where id = $1", [req.params.pid]);
  res.status(204).end();
});

// --- /projects/:pid/files ---------------------------------------------------

const projectFilesRouter = Router({ mergeParams: true });
projectsRouter.use("/:pid/files", projectFilesRouter);

projectFilesRouter.get("/", async (req: PidReq, res) => {
  if (!(await requireMember(req.params.pid, req.user!.id, res))) return;
  const { rows } = await query(
    "select id, path, language, updated_at from files where project_id = $1 order by path",
    [req.params.pid],
  );
  res.json(rows);
});

projectFilesRouter.post("/", async (req: PidReq, res) => {
  const parsed = createFileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid fields" });
  if (!(await requireMember(req.params.pid, req.user!.id, res))) return;

  const { path: filePath, language } = parsed.data;
  try {
    const { rows } = await query(
      `insert into files (project_id, path, language) values ($1, $2, $3)
       returning id, path, language, updated_at`,
      [req.params.pid, filePath, language ?? extToLanguage(filePath)],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (isDuplicatePath(err)) return res.status(409).json({ error: "path already exists" });
    throw err;
  }
});

// Deleting a *folder* row: the tree is derived, so the client has no id for it —
// it sends the prefix instead. Returns the removed ids so tabs can close.
projectFilesRouter.delete("/", async (req: PidReq, res) => {
  const parsed = z.object({ path: PathSchema }).safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "invalid path" });
  if (!(await requireMember(req.params.pid, req.user!.id, res))) return;

  res.json({ deleted: await deleteSubtree(req.params.pid, parsed.data.path) });
});

// Renaming a *folder* row: the tree is derived, so the client has no id for it —
// it sends the old prefix as ?path, and the new prefix as the body's `path`
// (just like PATCH /files/:fid sends its new path). One statement rewrites the
// prefix on every row under it, so `src/.gitkeep` travels with the folder.
projectFilesRouter.patch("/", async (req: PidReq, res) => {
  const from = z.object({ path: PathSchema }).safeParse(req.query);
  const parsed = z.object({ path: PathSchema }).safeParse(req.body);
  if (!from.success || !parsed.success) return res.status(400).json({ error: "invalid path" });
  if (!(await requireMember(req.params.pid, req.user!.id, res))) return;

  const [oldPrefix, newPrefix] = [from.data.path, parsed.data.path];
  // Rewriting only the prefix silently *merges* when the destination exists but
  // holds different names (src/a.ts -> lib/a.ts collides with nothing), and the
  // unique constraint cannot see that. So the destination has to be free: reject,
  // never merge (ADR 003). Moving a folder into its own subtree is exempt — there
  // the destination rows are the ones being moved.
  // ponytail: check-then-update, not atomic. Two renames onto the same free
  // destination at once could both pass; unique (project_id, path) still catches
  // a real path collision. Lock the project's rows if that ever bites.
  const intoItself = newPrefix === oldPrefix || newPrefix.startsWith(`${oldPrefix}/`);
  if (!intoItself) {
    const { rowCount } = await query(
      `select 1 from files where project_id = $1
       and (path = $2 or starts_with(path, $2 || '/')) limit 1`,
      [req.params.pid, newPrefix],
    );
    if (rowCount) return res.status(409).json({ error: "path already exists" });
  }

  try {
    const { rows } = await query(
      `update files
       set path = $1 || substring(path from length($2) + 1), updated_at = now()
       where project_id = $3 and (path = $2 or starts_with(path, $2 || '/'))
       returning id, path`,
      [newPrefix, oldPrefix, req.params.pid],
    );
    res.json(rows);
  } catch (err) {
    if (isDuplicatePath(err)) return res.status(409).json({ error: "path already exists" });
    throw err;
  }
});

// --- /projects/:pid/snapshots ------------------------------------------------
//
// Versions are per-file (`file_snapshots.file_id`), but the version search spans
// the project: match a version by its label or by the path of the file it belongs
// to. Metadata only, so snapshot blobs stay out of the list.
projectsRouter.get("/:pid/snapshots", async (req, res) => {
  if (!(await requireMember(req.params.pid, req.user!.id, res))) return;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) return res.json([]);

  const { rows } = await query(
    `select s.id, s.file_id, f.path, s.label, s.created_at
       from file_snapshots s
       join files f on f.id = s.file_id
      where f.project_id = $1
        and (f.path ilike '%' || $2 || '%' or coalesce(s.label, '') ilike '%' || $2 || '%')
      order by s.created_at desc
      limit 50`,
    [req.params.pid, q],
  );
  res.json(rows);
});

// --- /projects/:pid/export --------------------------------------------------
//
// The whole project as a zip: one entry per file row, paths at the archive root
// (ADR 004). Reads are member-level, and the text is live-doc-first (files/text.ts),
// so a file typed one second ago exports its current content, not the debounced row.
// `.gitkeep` is a folder placeholder the tree hides (ADR 001), so it is not a file
// here either — a folder holding only one is an empty project, and 400s like any other.
projectsRouter.get("/:pid/export", async (req: PidReq, res) => {
  if (!(await requireMember(req.params.pid, req.user!.id, res))) return;

  // the project name rides along with the file list — one round trip, not two
  const { rows } = await query(
    `select f.id, f.path, p.name as project_name
       from files f join projects p on p.id = f.project_id
      where f.project_id = $1
      order by f.path`,
    [req.params.pid],
  );
  const files = rows.filter((r) => !isPlaceholder(r.path));
  if (!files.length) return res.status(400).json({ error: "project has no files" });

  // Each entry is named from the same read that produced its text, so a rename
  // landing mid-export cannot pair one file's name with another's content.
  const entries = await Promise.all(
    files.map(async (f) => {
      const file = await getFileText(f.id);
      return { name: file?.path ?? f.path, text: file?.text ?? "" };
    }),
  );
  const zip = await createZip(entries);

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${zipFilename(rows[0].project_name ?? "")}"`,
  );
  res.send(zip);
});

// --- /files/:fid ------------------------------------------------------------

export const filesRouter = Router();

filesRouter.patch("/:fid", async (req: FidReq, res) => {
  const parsed = updateFileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid fields" });
  if (!(await fileForMember(req.params.fid, req.user!.id, res))) return;

  const { path: filePath, language } = parsed.data;
  try {
    const { rows } = await query(
      `update files
       set path = coalesce($1, path), language = coalesce($2, language), updated_at = now()
       where id = $3
       returning id, path, language, updated_at`,
      [filePath ?? null, language ?? null, req.params.fid],
    );
    res.json(rows[0]);
  } catch (err) {
    if (isDuplicatePath(err)) return res.status(409).json({ error: "path already exists" });
    throw err;
  }
});

filesRouter.delete("/:fid", async (req: FidReq, res) => {
  const file = await fileForMember(req.params.fid, req.user!.id, res);
  if (!file) return;

  res.json({ deleted: await deleteSubtree(file.project_id, file.path) });
});
