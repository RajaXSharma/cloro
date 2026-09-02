import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";

const createSchema = z.object({
  name: z.string().min(1),
  language: z.string().min(1).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
});

export const documentsRouter = Router();

// Every route here sits behind requireAuth (mounted in http.ts), so req.user exists.

documentsRouter.get("/", async (req, res) => {
  const { rows } = await query(
    `select d.id, d.name, d.language, d.owner_id, d.created_at, d.updated_at,
       (d.owner_id = $1) as is_owner
     from documents d
     where d.owner_id = $1
        or exists (select 1 from doc_collaborators c
                   where c.document_id = d.id and c.user_id = $1)
     order by d.updated_at desc`,
    [req.user!.id],
  );
  res.json(rows);
});

documentsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid fields" });

  const { name, language = "plaintext" } = parsed.data;
  const { rows } = await query(
    `insert into documents (name, language, owner_id)
     values ($1, $2, $3)
     returning id, name, language, owner_id, created_at, updated_at`,
    [name, language, req.user!.id],
  );
  res.status(201).json(rows[0]);
});

documentsRouter.get("/:id", async (req, res) => {
  const { rows } = await query(
    `select d.id, d.name, d.language, d.owner_id, d.created_at, d.updated_at
     from documents d
     where d.id = $1
       and (d.owner_id = $2
            or exists (select 1 from doc_collaborators c
                       where c.document_id = d.id and c.user_id = $2))`,
    [req.params.id, req.user!.id],
  );
  if (!rows[0]) return res.status(403).json({ error: "forbidden" });
  res.json(rows[0]);
});

documentsRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid fields" });

  const { rows } = await query("select owner_id from documents where id = $1", [
    req.params.id,
  ]);
  if (!rows[0] || rows[0].owner_id !== req.user!.id) {
    return res.status(403).json({ error: "forbidden" });
  }

  const { name, language } = parsed.data;
  const { rows: updated } = await query(
    `update documents
     set name = coalesce($1, name), language = coalesce($2, language), updated_at = now()
     where id = $3
     returning id, name, language, owner_id, created_at, updated_at`,
    [name ?? null, language ?? null, req.params.id],
  );
  res.json(updated[0]);
});

documentsRouter.delete("/:id", async (req, res) => {
  const { rows } = await query("select owner_id from documents where id = $1", [
    req.params.id,
  ]);
  if (!rows[0] || rows[0].owner_id !== req.user!.id) {
    return res.status(403).json({ error: "forbidden" });
  }
  await query("delete from documents where id = $1", [req.params.id]);
  res.status(204).end();
});
