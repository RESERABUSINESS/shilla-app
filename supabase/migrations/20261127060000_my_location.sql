-- The signed-in user's own saved location (RLS on user_locations limits it to
-- the owner). Lets a fresh install show the right city before GPS is allowed.
create function public.my_location()
returns table (lat double precision, lng double precision)
language sql stable security invoker
set search_path = public, extensions
as $$
  select st_y(location::geometry), st_x(location::geometry) from public.user_locations where user_id = auth.uid()
$$;

revoke execute on function public.my_location() from public, anon;
grant execute on function public.my_location() to authenticated;
