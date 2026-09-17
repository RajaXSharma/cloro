import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { query } from "../db.js";

// mounted at /projects/:pid/collaborators — mergeParams supplies :pid.
// Owner-only: inviting people to a project is not an editor's call.
export const collaboratorsRouter = Router({ mergeParams: true });

const inviteSchema = z.object({ email: z.email().toLowerCase() });

type PidReq = Request<{ pid: string }>;

async function requireOwner(req: PidReq, res: Response) {
  const { rows } = await query("select owner_id from projects where id = $1", [
    req.params.pid,
  ]);
  if (!rows[0]) {
    res.status(404).json({ error: "project not found" });
    return null;
  }
  if (rows[0].owner_id !== req.user!.id) {
    res.status(403).json({ error: "forbidden" });
    return null;
  }
  return req.params.pid;
}

collaboratorsRouter.get("/", async (req: PidReq, res) => {
  const projectId = await requireOwner(req, res);
  if (!projectId) return;
  const { rows } = await query(
    `select c.id, c.user_id, u.email, u.name
     from project_collaborators c join users u on u.id = c.user_id
     where c.project_id = $1 order by u.email`,
    [projectId],
  );
  res.json(rows);
});

collaboratorsRouter.post("/", async (req: PidReq, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid fields" });
  const projectId = await requireOwner(req, res);
  if (!projectId) return;

  const { rows: users } = await query(
    "select id from users where email = $1",
    [parsed.data.email],
  );
  if (!users[0]) return res.status(404).json({ error: "no user with that email" });

  await query(
    `insert into project_collaborators (project_id, user_id, role)
     values ($1, $2, 'editor') on conflict do nothing`,
    [projectId, users[0].id],
  );
  res.status(201).json({ ok: true });
});

collaboratorsRouter.delete("/:cid", async (req: Request<{ pid: string; cid: string }>, res) => {
  const projectId = await requireOwner(req, res);
  if (!projectId) return;
  const { rowCount } = await query(
    "delete from project_collaborators where id = $1 and project_id = $2",
    [req.params.cid, projectId],
  );
  if (!rowCount) return res.status(404).json({ error: "collaborator not found" });
  res.json({ ok: true });
});
