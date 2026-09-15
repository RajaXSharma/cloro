import type { Extension } from '@hocuspocus/server';
import { verifyToken } from '../auth.js';
import { isProjectMember, projectOfFile } from '../db.js';

export const auth: Extension = {
  async onAuthenticate({ documentName, token }) {
    const user = await verifyToken(token);
    if (!user) throw new Error('unauthorized');

    // roster docs are named "roster:<projectId>"; every other doc is a file id
    const projectId = documentName.startsWith('roster:')
      ? documentName.slice('roster:'.length)
      : await projectOfFile(documentName);

    if (!projectId || !(await isProjectMember(projectId, user.id))) {
      throw new Error('not a member');
    }

    return { user };
  },
};
