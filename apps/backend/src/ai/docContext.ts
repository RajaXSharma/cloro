import * as Y from "yjs";
import { query } from "../db.js";
import { hocuspocus } from "../collab.js";

const MAX_CHARS = 30_000;

// RAG-lite: whole file in-context, no vector DB. Live doc first (fresher than
// the debounced DB write), stored yjs_state as fallback when nobody is connected.
export async function getDocText(
  docId: string,
): Promise<{ name: string; text: string } | null> {
  const { rows } = await query(
    "select name, yjs_state from documents where id = $1",
    [docId],
  );
  if (!rows[0]) return null;

  const live = hocuspocus.hocuspocus.documents.get(docId);
  let doc: Y.Doc;
  if (live) {
    doc = live;
  } else {
    doc = new Y.Doc();
    if (rows[0].yjs_state) Y.applyUpdate(doc, rows[0].yjs_state);
  }

  let text = doc.getText("content").toString();
  if (text.length > MAX_CHARS)
    text = text.slice(0, MAX_CHARS) + "\n\n[document truncated at 30,000 characters]";
  return { name: rows[0].name, text };
}
