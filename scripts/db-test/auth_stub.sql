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
-- Stand-in for pg_net: records outgoing HTTP calls so tests can check pushes.
create schema if not exists net;
create table if not exists net._calls (url text, body jsonb, at timestamptz default now());
create or replace function net.http_post(url text, body jsonb, headers jsonb default '{}'::jsonb)
returns bigint language sql as $$ insert into net._calls (url, body) values (url, body) returning 1::bigint $$;
-- Like Supabase: tables created later are granted to these roles by default,
-- so a migration's own revoke/grant (column grants) is what tests see.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant usage on sequences to authenticated;
