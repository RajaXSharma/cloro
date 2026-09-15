import { Pool } from 'pg';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const query = (text: string, params?: unknown[]) => pool.query(text, params);

// a file never lives outside a project, so its project id is also its access key
export async function projectOfFile(fileId: string): Promise<string | null> {
  const { rows } = await query('select project_id from files where id = $1', [fileId]);
  return rows[0]?.project_id ?? null;
}

// one query for the common case: "may this user touch this file?"
export async function isFileMember(fileId: string, userId: string) {
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
  const { rowCount } = await query(
    `select 1 from projects p where p.id = $1 and (p.owner_id = $2
      or exists (select 1 from project_collaborators c
                 where c.project_id = p.id and c.user_id = $2))`,
    [projectId, userId],
  );
  return (rowCount ?? 0) > 0;
}
