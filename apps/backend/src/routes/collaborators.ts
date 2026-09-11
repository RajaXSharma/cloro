import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { query } from "../db.js";

export const collaboratorsRouter = Router({ mergeParams: true });

const inviteSchema = z.object({ email: z.email() });

type DocReq = Request<{ id: string }>;

// owner-only guard shared by all three routes
async function requireOwner(req: DocReq, res: Response) {
  const { rows } = await query("select owner_id from documents where id = $1", [
    req.params.id,
  ]);
  if (!rows[0]) {
    res.status(404).json({ error: "document not found" });
    return false;
  }
  if (rows[0].owner_id !== req.user!.id) {
    res.status(403).json({ error: "forbidden" });
    return false;
  }
  return true;
}

collaboratorsRouter.get("/", async (req: DocReq, res) => {
  if (!(await requireOwner(req, res))) return;
  const { rows } = await query(
    `select c.id, c.user_id, u.email, u.name
     from doc_collaborators c join users u on u.id = c.user_id
     where c.document_id = $1 order by u.email`,
    [req.params.id],
  );
  res.json(rows);
});

collaboratorsRouter.post("/", async (req: DocReq, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid fields" });
  if (!(await requireOwner(req, res))) return;

  const { rows: users } = await query(
    "select id from users where email = $1",
    [parsed.data.email.toLowerCase()],
  );
  if (!users[0]) return res.status(404).json({ error: "no user with that email" });

  await query(
    `insert into doc_collaborators (document_id, user_id, role)
     values ($1, $2, 'editor') on conflict do nothing`,
    [req.params.id, users[0].id],
  );
  res.status(201).json({ ok: true });
});

collaboratorsRouter.delete("/:cid", async (req: Request<{ id: string; cid: string }>, res) => {
  if (!(await requireOwner(req, res))) return;
  const { rowCount } = await query(
    "delete from doc_collaborators where id = $1 and document_id = $2",
    [req.params.cid, req.params.id],
  );
  if (!rowCount) return res.status(404).json({ error: "collaborator not found" });
  res.json({ ok: true });
});
