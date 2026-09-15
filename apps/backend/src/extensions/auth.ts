import type { Extension } from '@hocuspocus/server';
import { verifyToken } from '../auth.js';
import { isFileMember } from '../db.js';

export const auth: Extension = {
  async onAuthenticate({ documentName, token }) {
    const user = await verifyToken(token);
    if (!user) throw new Error('unauthorized');

    // U2 rewrites this for roster:* docs; a file doc resolves through its project
    if (!(await isFileMember(documentName, user.id))) {
      throw new Error('not a member of this file');
    }

    return { user };
  },
};
