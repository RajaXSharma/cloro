import type { Extension } from '@hocuspocus/server';
import * as Y from 'yjs';
import { query } from '../db.js';

export const persistence: Extension = {
  async onLoadDocument({ documentName }) {
    const { rows } = await query(
      'SELECT yjs_state FROM documents WHERE id = $1',
      [documentName],
    );
    const state = rows[0]?.yjs_state as Buffer | undefined;
    return state ?? undefined;
  },

  async onStoreDocument({ documentName, document }) {
    await query('UPDATE documents SET yjs_state = $1, updated_at = now() WHERE id = $2', [
      Y.encodeStateAsUpdate(document),
      documentName,
    ]);
  },
};