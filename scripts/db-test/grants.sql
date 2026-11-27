-- Schema access. Table grants come from default privileges (auth_stub.sql),
-- applied as each migration creates its tables, like on Supabase.
grant usage on schema public to authenticated, anon;
