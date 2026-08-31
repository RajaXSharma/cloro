import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

await pool.query(
  `create table if not exists schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )`
);

const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

for (const file of files) {
  const { rowCount } = await pool.query('select 1 from schema_migrations where filename = $1', [file]);
  if (rowCount) continue;

  const sql = await readFile(path.join(migrationsDir, file), 'utf8');
  await pool.query('begin');
  try {
    await pool.query(sql);
    await pool.query('insert into schema_migrations (filename) values ($1)', [file]);
    await pool.query('commit');
    console.log(`applied ${file}`);
  } catch (err) {
    await pool.query('rollback');
    throw err;
  }
}

console.log(`done: ${files.length} migration file(s)`);
await pool.end();
