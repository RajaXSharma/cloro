import { ZipArchive } from "archiver";
import { finished } from "node:stream/promises";

export interface ZipEntry {
  /** Path inside the archive — a file's `files.path`, at the archive root (ADR 004). */
  name: string;
  text: string;
}

/**
 * Builds the whole archive in memory. Project files are text and small; if one ever
 * grows enough that buffering hurts, pipe the archive straight into the response.
 */
export async function createZip(entries: ZipEntry[]): Promise<Buffer> {
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));

  for (const entry of entries) archive.append(entry.text, { name: entry.name });

  // Two different "done"s: finalize() resolves on the zip module's end, finished()
  // on the readable side having drained. Waiting for both is what guarantees
  // `chunks` holds the central directory and not just the entries.
  await Promise.all([archive.finalize(), finished(archive)]);

  return Buffer.concat(chunks);
}
