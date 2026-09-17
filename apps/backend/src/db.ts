import { Pool } from 'pg';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const query = (text: string, params?: unknown[]) => pool.query(text, params);

// Every id in this schema is a uuid, and a stray string reaching a `uuid` column
// makes Postgres raise 22P02 mid-query -> an unhandled 500. Ids arrive from the
// URL, from `roster:<pid>`, and from a token's `sub`, so screen them here: a
// non-uuid is simply "no such row", which every caller already handles.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (id: string) => UUID_RE.test(id);

// a file never lives outside a project, so its project id is also its access key
export async function projectOfFile(fileId: string): Promise<string | null> {
  if (!isUuid(fileId)) return null;
  const { rows } = await query('select project_id from files where id = $1', [fileId]);
  return rows[0]?.project_id ?? null;
}

// one query for the common case: "may this user touch this file?"
export async function isFileMember(fileId: string, userId: string) {
  if (!isUuid(fileId) || !isUuid(userId)) return false;
  const { rowCount } = await query(
    `select 1 from files f join projects p on p.id = f.project_id
     where f.id = $1 and (p.owner_id = $2
       or exists (select 1 from project_collaborators c
                  where c.project_id = p.id and c.user_id = $2))`,
    [fileId, userId],
  );
  return (rowCount ?? 0) > 0;
}
export async function isProjectMember(projectId: string, userId: string) {
  if (!isUuid(projectId) || !isUuid(userId)) return false;
  const { rowCount } = await query(
    `select 1 from projects p where p.id = $1 and (p.owner_id = $2
      or exists (select 1 from project_collaborators c
                 where c.project_id = p.id and c.user_id = $2))`,
    [projectId, userId],
  );
  return (rowCount ?? 0) > 0;
}

// owner_id of a project, or null when the id is not a uuid / no such project.
// Shared by project PATCH/DELETE and collaborator invites; each caller maps null
// to its own status code.
export async function projectOwner(projectId: string): Promise<string | null> {
  if (!isUuid(projectId)) return null;
  const { rows } = await query('select owner_id from projects where id = $1', [projectId]);
  return rows[0]?.owner_id ?? null;
}
