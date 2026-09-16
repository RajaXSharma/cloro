import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import * as Y from 'yjs';

vi.mock('../db.js', () => ({
  projectOfFile: vi.fn(),
  isProjectMember: vi.fn(),
  query: vi.fn(),
}));

import { projectOfFile, isProjectMember, query } from '../db.js';
import { auth } from './auth.js';
import { persistence } from './persistence.js';

const projectOfFileMock = vi.mocked(projectOfFile);
const isProjectMemberMock = vi.mocked(isProjectMember);
const queryMock = vi.mocked(query);

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

async function token(expires = '15m') {
  return new SignJWT({ email: 't@x.com', name: 'T' })
    .setSubject('user-1')
    .setIssuedAt()
    .setExpirationTime(expires)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);
}

const authenticate = (documentName: string, t: string) =>
  auth.onAuthenticate!({ documentName, token: t } as never);

beforeEach(() => {
  vi.clearAllMocks();
  queryMock.mockResolvedValue({ rows: [] } as never);
});

describe('ws auth', () => {
  it('rejects a garbage token before any lookup', async () => {
    await expect(authenticate('roster:p1', 'garbage')).rejects.toThrow('unauthorized');
    expect(isProjectMemberMock).not.toHaveBeenCalled();
  });

  it('resolves a file doc through its project', async () => {
    projectOfFileMock.mockResolvedValue('p1');
    isProjectMemberMock.mockResolvedValue(true);
    await expect(authenticate('file-1', await token())).resolves.toEqual({
      user: { id: 'user-1', email: 't@x.com', name: 'T' },
    });
    expect(isProjectMemberMock).toHaveBeenCalledWith('p1', 'user-1');
  });

  it('resolves a roster doc straight to its project', async () => {
    isProjectMemberMock.mockResolvedValue(true);
    await authenticate('roster:p1', await token());
    expect(projectOfFileMock).not.toHaveBeenCalled();
    expect(isProjectMemberMock).toHaveBeenCalledWith('p1', 'user-1');
  });

  it('rejects a non-member on both doc kinds with the same error', async () => {
    isProjectMemberMock.mockResolvedValue(false);
    projectOfFileMock.mockResolvedValue('p1');
    const t = await token();
    await expect(authenticate('roster:p1', t)).rejects.toThrow('not a member');
    await expect(authenticate('file-1', t)).rejects.toThrow('not a member');
  });

  it('rejects a file doc that does not exist', async () => {
    projectOfFileMock.mockResolvedValue(null);
    await expect(authenticate('missing', await token())).rejects.toThrow('not a member');
    expect(isProjectMemberMock).not.toHaveBeenCalled();
  });
});

describe('persistence', () => {
  it('seeds the roster map from the DB but never stores it back', async () => {
    queryMock.mockResolvedValue({ rows: [{ id: 'f1', path: 'src/a.ts' }] } as never);
    const loaded = (await persistence.onLoadDocument!({
      documentName: 'roster:p1',
    } as never)) as Y.Doc;
    expect(loaded.getMap<string>('files').get('f1')).toBe('src/a.ts');
    expect(queryMock).toHaveBeenCalledTimes(1);

    await persistence.onStoreDocument!({
      documentName: 'roster:p1',
      document: loaded,
    } as never);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('loads and stores file docs', async () => {
    await persistence.onLoadDocument!({ documentName: 'file-1' } as never);
    await persistence.onStoreDocument!({
      documentName: 'file-1',
      document: new Y.Doc(),
    } as never);
    expect(queryMock).toHaveBeenCalledTimes(2);
  });
});
