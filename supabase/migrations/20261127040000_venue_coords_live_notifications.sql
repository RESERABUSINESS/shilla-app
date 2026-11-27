-- The map needs venue coordinates, plus provenance for the "unverified" tag.
-- Return type changes, so the function is dropped and recreated.
drop function public.nearby_venues(double precision, double precision, double precision, text);

create function public.nearby_venues(lat double precision, lng double precision, radius_km double precision default 15, p_hobby text default null)
returns table (
  id uuid, name text, kind text, district text, audience public.venue_audience,
  men_hours text, women_hours text, price_label text, rating numeric,
  hobbies text[], distance_km double precision,
  latitude double precision, longitude double precision,
  verified boolean, source text, address text
)
language sql stable security invoker
set search_path = public, extensions
as $$
  select v.id, v.name, v.kind, v.district, v.audience, v.men_hours, v.women_hours, v.price_label, v.rating,
         array(select vh.hobby_id from public.venue_hobbies vh where vh.venue_id = v.id order by vh.hobby_id),
         round((st_distance(v.location, st_makepoint(lng, lat)::geography) / 1000)::numeric, 1)::double precision,
         st_y(v.location::geometry), st_x(v.location::geometry),
         v.verified, v.source, v.address
  from public.venues v
  where st_dwithin(v.location, st_makepoint(lng, lat)::geography, radius_km * 1000)
    and (p_hobby is null or exists (select 1 from public.venue_hobbies vh where vh.venue_id = v.id and vh.hobby_id = p_hobby))
  order by 11
$$;

revoke execute on function public.nearby_venues(double precision, double precision, double precision, text) from public, anon;
grant execute on function public.nearby_venues(double precision, double precision, double precision, text) to authenticated;

-- Live notification badge: stream new notifications (RLS limits each user to their own).
alter publication supabase_realtime add table public.notifications;
