import { Router, type Request } from "express";

type DocReq = Request<{ id: string }>;
type RestoreReq = Request<{ id: string; sid: string }>;
import * as Y from "yjs";
import { isMember, query } from "../db.js";
import { hocuspocus } from "../collab.js";

export const snapshotsRouter = Router({ mergeParams: true });

function currentState(docId: string): Uint8Array | null {
  // Server wraps the Hocuspocus core — the live-docs map is on the inner object
  const live = hocuspocus.hocuspocus.documents.get(docId);
  if (live) return Y.encodeStateAsUpdate(live);
  return null;
}

// list snapshots
snapshotsRouter.get("/", async (req: DocReq, res) => {
  if (!(await isMember(req.params.id, req.user!.id))) return res.status(403).json({ error: "forbidden" });
  const { rows } = await query(
    `select id, label, created_at from doc_snapshots
     where document_id = $1 order by created_at desc`,
    [req.params.id],
  );
  res.json(rows);
});

// create snapshot of the current live state
snapshotsRouter.post("/", async (req: DocReq, res) => {
  if (!(await isMember(req.params.id, req.user!.id))) return res.status(403).json({ error: "forbidden" });

  const state = currentState(req.params.id);
  if (!state) return res.status(409).json({ error: "document never opened, nothing to snapshot" });

  const label = typeof req.body?.label === "string" ? req.body.label : null;
  const { rows } = await query(
    `insert into doc_snapshots (document_id, state, label, created_by)
     values ($1, $2, $3, $4) returning id, label, created_at`,
    [req.params.id, Buffer.from(state), label, req.user!.id],
  );
  res.status(201).json(rows[0]);
});

// restore: replace live content with snapshot content (an ordinary edit —
// every connected peer receives it and the debounced persistence saves it)
snapshotsRouter.post("/:sid/restore", async (req: RestoreReq, res) => {
  if (!(await isMember(req.params.id, req.user!.id))) return res.status(403).json({ error: "forbidden" });

  const { rows } = await query(
    "select state from doc_snapshots where id = $1 and document_id = $2",
    [req.params.sid, req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "snapshot not found" });

  const snapState: Uint8Array = new Uint8Array(rows[0].state);
  const live = hocuspocus.hocuspocus.documents.get(req.params.id);

  if (live) {
    // re-applying the snapshot update directly is a no-op (its clock is already
    // merged), so restore = replace the text content in one transaction
    const restored = new Y.Doc();
    Y.applyUpdate(restored, snapState);
    const text = restored.getText("content").toString();
    live.transact(() => {
      const t = live.getText("content");
      t.delete(0, t.length);
      t.insert(0, text);
    });
  } else {
    // nobody connected: revert the stored state directly
    await query(
      "update documents set yjs_state = $1, updated_at = now() where id = $2",
      [Buffer.from(snapState), req.params.id],
    );
  }

  res.json({ ok: true });
});
