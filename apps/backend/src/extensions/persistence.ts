import type { Extension } from '@hocuspocus/server';
import * as Y from 'yjs';
import { query } from '../db.js';


const isRoster = (name: string) => name.startsWith('roster:');

export const persistence: Extension = {
  async onLoadDocument({ documentName }) {
    if (isRoster(documentName)) {
      const doc = new Y.Doc();
      const { rows } = await query('SELECT id, path FROM files WHERE project_id = $1', [
        documentName.slice('roster:'.length),
      ]);
      const files = doc.getMap<string>('files');
      doc.transact(() => {
        for (const row of rows) files.set(row.id as string, row.path as string);
      });
      return doc;
    }

    const { rows } = await query(
      'SELECT yjs_state FROM files WHERE id = $1',
      [documentName],
    );
    const state = rows[0]?.yjs_state as Buffer | undefined;
    return state ?? undefined;
  },

  async onStoreDocument({ documentName, document }) {
    if (isRoster(documentName)) return;

    await query('UPDATE files SET yjs_state = $1, updated_at = now() WHERE id = $2', [
      Y.encodeStateAsUpdate(document),
      documentName,
    ]);
  },
};
