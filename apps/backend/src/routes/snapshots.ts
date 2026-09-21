import { Router, type Request } from "express";

type FileReq = Request<{ fid: string }>;
type RestoreReq = Request<{ fid: string; sid: string }>;
import * as Y from "yjs";
import { isFileMember, query, isUuid } from "../db.js";
import { hocuspocus } from "../collab.js";

// mounted at /files/:fid/snapshots — mergeParams supplies :fid
export const snapshotsRouter = Router({ mergeParams: true });

function currentState(docId: string): Uint8Array | null {
  // Server wraps the Hocuspocus core — the live-docs map is on the inner object
  const live = hocuspocus.documents.get(docId);
  if (live) return Y.encodeStateAsUpdate(live);
  return null;
}

// list snapshots
snapshotsRouter.get("/", async (req: FileReq, res) => {
  if (!(await isFileMember(req.params.fid, req.user!.id))) return res.status(403).json({ error: "forbidden" });
  const { rows } = await query(
    `select id, label, created_at from file_snapshots
     where file_id = $1 order by created_at desc`,
    [req.params.fid],
  );
  res.json(rows);
});

// create snapshot of the current live state
snapshotsRouter.post("/", async (req: FileReq, res) => {
  if (!(await isFileMember(req.params.fid, req.user!.id))) return res.status(403).json({ error: "forbidden" });

  const state = currentState(req.params.fid);
  if (!state) return res.status(409).json({ error: "document never opened, nothing to snapshot" });

  const label = typeof req.body?.label === "string" ? req.body.label : null;
  const { rows } = await query(
    `insert into file_snapshots (file_id, state, label, created_by)
     values ($1, $2, $3, $4) returning id, label, created_at`,
    [req.params.fid, Buffer.from(state), label, req.user!.id],
  );
  res.status(201).json(rows[0]);
});

// restore: replace live content with snapshot content (an ordinary edit —
// every connected peer receives it and the debounced persistence saves it)
snapshotsRouter.post("/:sid/restore", async (req: RestoreReq, res) => {
  if (!(await isFileMember(req.params.fid, req.user!.id))) return res.status(403).json({ error: "forbidden" });
  if (!isUuid(req.params.sid)) return res.status(404).json({ error: "snapshot not found" });

  const { rows } = await query(
    "select state from file_snapshots where id = $1 and file_id = $2",
    [req.params.sid, req.params.fid],
  );
  if (!rows[0]) return res.status(404).json({ error: "snapshot not found" });

  const snapState: Uint8Array = new Uint8Array(rows[0].state);
  const live = hocuspocus.documents.get(req.params.fid);

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
      "update files set yjs_state = $1, updated_at = now() where id = $2",
      [Buffer.from(snapState), req.params.fid],
    );
  }

  res.json({ ok: true });
});
