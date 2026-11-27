-- Minimal stand-ins for what Supabase provides, so the migration can be
-- tested on a plain local Postgres (with PostGIS installed).
create schema if not exists extensions;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
end $$;
grant usage on schema auth, extensions to authenticated, anon;
alter database current_database_placeholder set search_path = public, extensions;
-- Supabase creates this publication; the realtime migration adds tables to it.
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then create publication supabase_realtime; end if;
end $$;
