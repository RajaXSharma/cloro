import { Pool } from 'pg';

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const query = (text: string, params?: unknown[]) => pool.query(text, params);

export async function isMember(docId: string, userId: string) {
  const { rowCount } = await query(
    `select 1 from documents d where d.id = $1 and (d.owner_id = $2
      or exists (select 1 from doc_collaborators c
                 where c.document_id = d.id and c.user_id = $2))`,
    [docId, userId],
  );
  return (rowCount ?? 0) > 0;
}
