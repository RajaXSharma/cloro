import type { Extension } from '@hocuspocus/server';
import { verifyToken } from '../auth.js';
import { query } from '../db.js';

export const auth: Extension = {
  async onAuthenticate({ documentName, token }) {
    const user = await verifyToken(token);
    if (!user) throw new Error('unauthorized');

    const { rowCount } = await query(
      `SELECT 1 FROM documents WHERE id = $1 AND owner_id = $2
       UNION
       SELECT 1 FROM doc_collaborators WHERE document_id = $1 AND user_id = $2`,
      [documentName, user.id],
    );
    if (rowCount === 0) throw new Error('not a member of this document');

    return { user };
  },
};
