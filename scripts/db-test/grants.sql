-- Supabase grants table access to these roles by default; RLS then restricts rows.
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.hobbies, public.hobby_categories to anon;
grant usage on all sequences in schema public to authenticated;
