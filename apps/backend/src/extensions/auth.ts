import type { Extension } from '@hocuspocus/server';
import { verifyToken } from '../auth.js';
import { isMember } from '../db.js';

export const auth: Extension = {
  async onAuthenticate({ documentName, token }) {
    const user = await verifyToken(token);
    if (!user) throw new Error('unauthorized');

    if (!(await isMember(documentName, user.id))) {
      throw new Error('not a member of this document');
    }

    return { user };
  },
};
