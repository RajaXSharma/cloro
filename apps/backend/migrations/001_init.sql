create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  avatar_url text,
  password_hash text,
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  language text not null default 'plaintext',
  owner_id uuid not null references users(id),
  yjs_state bytea,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table doc_collaborators (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  unique (document_id, user_id)
);

create table doc_snapshots (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  state bytea not null,
  label text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
