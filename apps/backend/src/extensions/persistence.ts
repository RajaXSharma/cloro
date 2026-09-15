import type { Extension } from '@hocuspocus/server';
import * as Y from 'yjs';
import { query } from '../db.js';

// roster docs are transport-only: nothing is ever read from or written to Postgres
const isRoster = (name: string) => name.startsWith('roster:');

export const persistence: Extension = {
  async onLoadDocument({ documentName }) {
    if (isRoster(documentName)) return undefined;

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
