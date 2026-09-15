import { Router, type Response } from "express";
import { z } from "zod";
import { PathSchema, extToLanguage } from "shared";
import { isFileMember, pool, query } from "../db.js";
import { snapshotsRouter } from "./snapshots.js";
import { collaboratorsRouter } from "./collaborators.js";

// THROWAWAY BRIDGE (U1–U5): the old dashboard and /doc pages still speak
// /documents with a `name`. A legacy "document" is now a one-file project, and
// `name` is that file's path. Deleted in U6 with the pages that use it —
// repoint, don't polish.

const createSchema = z.object({
  name: PathSchema,
  language: z.string().min(1).optional(),
});

const updateSchema = z.object({
  name: PathSchema.optional(),
  language: z.string().min(1).optional(),
});

export const documentsRouter = Router();

// nested routes still take a file id here; U6 remounts them under projects/files
documentsRouter.use("/:id/snapshots", snapshotsRouter);
documentsRouter.use("/:id/collaborators", collaboratorsRouter);

async function requireOwner(id: string, userId: string, res: Response) {
  const { rows } = await query(
    `select p.owner_id from files f join projects p on p.id = f.project_id
     where f.id = $1`,
    [id],
  );
  if (!rows[0]) {
    res.status(404).json({ error: "document not found" });
    return false;
  }
  if (rows[0].owner_id !== userId) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }
  return true;
}

// Every route here sits behind requireAuth (mounted in http.ts), so req.user exists.

documentsRouter.get("/", async (req, res) => {
  const { rows } = await query(
    `select f.id, f.path as name, f.language, f.project_id, p.owner_id,
       (p.owner_id = $1) as is_owner, f.created_at, f.updated_at
     from files f join projects p on p.id = f.project_id
     where p.owner_id = $1
        or exists (select 1 from project_collaborators c
                   where c.project_id = p.id and c.user_id = $1)
     order by f.updated_at desc`,
    [req.user!.id],
  );
  res.json(rows);
});

// a legacy "new document" is a new one-file project
documentsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid fields" });

  const { name, language } = parsed.data;
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows: projects } = await client.query(
      "insert into projects (name, owner_id) values ($1, $2) returning id",
      [name, req.user!.id],
    );
    const { rows } = await client.query(
      `insert into files (project_id, path, language) values ($1, $2, $3)
       returning id, path as name, language, created_at, updated_at`,
      [projects[0].id, name, language ?? extToLanguage(name)],
    );
    await client.query("commit");
    res.status(201).json({ ...rows[0], owner_id: req.user!.id, is_owner: true });
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
});

documentsRouter.get("/:id", async (req, res) => {
  if (!(await isFileMember(req.params.id, req.user!.id)))
    return res.status(403).json({ error: "forbidden" });
  const { rows } = await query(
    `select f.id, f.path as name, f.language, f.project_id, p.owner_id,
       (p.owner_id = $2) as is_owner, f.created_at, f.updated_at
     from files f join projects p on p.id = f.project_id
     where f.id = $1`,
    [req.params.id, req.user!.id],
  );
  res.json(rows[0]);
});

documentsRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid fields" });
  if (!(await requireOwner(req.params.id, req.user!.id, res))) return;

  const { name, language } = parsed.data;
  const { rows } = await query(
    `update files
     set path = coalesce($1, path), language = coalesce($2, language), updated_at = now()
     where id = $3
     returning id, path as name, language, created_at, updated_at`,
    [name ?? null, language ?? null, req.params.id],
  );
  res.json(rows[0]);
});

documentsRouter.delete("/:id", async (req, res) => {
  if (!(await requireOwner(req.params.id, req.user!.id, res))) return;
  // the project itself survives as an empty one — the /projects dashboard owns it
  await query("delete from files where id = $1", [req.params.id]);
  res.status(204).end();
});
