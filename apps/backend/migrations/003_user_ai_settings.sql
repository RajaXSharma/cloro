-- per-user AI credentials (BYOK): key + model required to use AI routes
alter table users
  add column ai_api_key text,
  add column ai_model text,
  add column ai_base_url text;
