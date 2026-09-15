create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  -- temporary join key for the backfill below; dropped at the end
  legacy_document_id uuid
);

alter table documents rename to files;

alter table files
  add column project_id uuid references projects(id) on delete cascade,
  add column path text;


insert into projects (name, owner_id, legacy_document_id)
select name, owner_id, id from files;

update files f
  set project_id = p.id, path = f.name
  from projects p
  where p.legacy_document_id = f.id;

alter table projects drop column legacy_document_id;

alter table files
  alter column project_id set not null,
  alter column path set not null,
  drop column name,
  drop column owner_id,
  add constraint files_project_id_path_key unique (project_id, path);

alter table doc_collaborators rename to project_collaborators;
alter table project_collaborators rename column document_id to project_id;


alter table doc_snapshots rename to file_snapshots;
alter table file_snapshots rename column document_id to file_id;
alter table file_snapshots rename constraint doc_snapshots_pkey to file_snapshots_pkey;
alter table file_snapshots rename constraint doc_snapshots_document_id_fkey to file_snapshots_file_id_fkey;
alter table file_snapshots rename constraint doc_snapshots_created_by_fkey to file_snapshots_created_by_fkey;

alter table project_collaborators drop constraint doc_collaborators_document_id_fkey;

update project_collaborators c
  set project_id = f.project_id
  from files f
  where f.id = c.project_id;

alter table project_collaborators
  add constraint project_collaborators_project_id_fkey
  foreign key (project_id) references projects(id) on delete cascade;

alter table project_collaborators rename constraint doc_collaborators_pkey to project_collaborators_pkey;
alter table project_collaborators rename constraint doc_collaborators_document_id_user_id_key to project_collaborators_project_id_user_id_key;
alter table project_collaborators rename constraint doc_collaborators_user_id_fkey to project_collaborators_user_id_fkey;
alter table project_collaborators rename constraint doc_collaborators_role_check to project_collaborators_role_check;

alter table files rename constraint documents_pkey to files_pkey;
