import * as Y from "yjs";
import { query } from "../db.js";
import { hocuspocus } from "../collab.js";

/**
 * A file's text, live-doc first: the Y.Doc held by Hocuspocus is fresher than
 * `yjs_state`, which lags by the 2s persistence debounce. Falls back to the stored
 * state when nobody has the file open.
 *
 * No truncation — a caller with a budget applies its own (`ai/docContext.ts` caps
 * the AI prompt; export ships the file whole).
 */
export async function getFileText(
  fileId: string,
): Promise<{ path: string; text: string } | null> {
  const { rows } = await query(
    "select path, yjs_state from files where id = $1",
    [fileId],
  );
  if (!rows[0]) return null;

  // Server wraps the Hocuspocus core — the live-docs map is on the inner object
  const live = hocuspocus.hocuspocus.documents.get(fileId);
  let doc: Y.Doc;
  if (live) {
    doc = live;
  } else {
    doc = new Y.Doc();
    if (rows[0].yjs_state) Y.applyUpdate(doc, rows[0].yjs_state);
  }

  return { path: rows[0].path, text: doc.getText("content").toString() };
}
