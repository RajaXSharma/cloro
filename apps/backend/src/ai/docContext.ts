import { getFileText } from "../files/text.js";

const MAX_CHARS = 30_000;

// RAG-lite: whole file in-context, no vector DB. The read itself (live doc first,
// stored state as fallback) lives in files/text.ts, shared with project export —
// this cap is the prompt's budget, not a rule about files.
export async function getDocText(
  docId: string,
): Promise<{ path: string; text: string } | null> {
  const file = await getFileText(docId);
  if (!file) return null;

  const text =
    file.text.length > MAX_CHARS
      ? file.text.slice(0, MAX_CHARS) + "\n\n[document truncated at 30,000 characters]"
      : file.text;
  return { path: file.path, text };
}
