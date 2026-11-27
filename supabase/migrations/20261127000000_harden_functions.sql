-- Hardening from the Supabase security advisor.
--
-- Helper and trigger functions move to a `private` schema, which the API does
-- not expose, so they cannot be called through /rest/v1/rpc. Policies and
-- triggers reference functions by OID, so they keep working after the move.
-- Only the two read APIs stay public, and only for signed-in users.

create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.my_gender() set schema private;
alter function public.is_session_participant(uuid) set schema private;
alter function public.session_gender(uuid) set schema private;
alter function public.is_blocked_between(uuid, uuid) set schema private;
alter function public.check_session() set schema private;
alter function public.check_membership() set schema private;
alter function public.prevent_gender_change() set schema private;

alter function private.prevent_gender_change() set search_path = public;

-- people_matches calls is_blocked_between by name; point it at the new schema.
create or replace function public.people_matches(radius_km double precision default 15, max_rows int default 50)
returns table (user_id uuid, first_name text, shared_hobbies text[], distance_km int, score int)
language sql stable security definer
set search_path = public, extensions
as $$
  with me as (
    select p.id, p.gender, l.location
    from public.profiles p
    join public.user_locations l on l.user_id = p.id
    where p.id = auth.uid()
  ),
  candidates as (
    select o.id, o.first_name,
           array_agg(oh.hobby_id order by oh.hobby_id) as shared,
           avg(abs(oh.level - mh.level)) as level_gap,
           st_distance(ol.location, me.location) / 1000 as km
    from me
    join public.profiles o on o.gender = me.gender and o.id <> me.id
    join public.user_locations ol on ol.user_id = o.id
    join public.user_hobbies oh on oh.user_id = o.id
    join public.user_hobbies mh on mh.user_id = me.id and mh.hobby_id = oh.hobby_id
    where st_dwithin(ol.location, me.location, radius_km * 1000)
      and not private.is_blocked_between(me.id, o.id)
    group by o.id, o.first_name, ol.location, me.location
  )
  select id, first_name, shared, greatest(1, round(km))::int,
         least(98, greatest(55, round(70 + cardinality(shared) * 9 - level_gap * 8 - km * 2)))::int
  from candidates
  order by 5 desc
  limit max_rows
$$;

-- check_membership also calls is_blocked_between by name.
create or replace function private.check_membership()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  s public.sessions%rowtype;
  member_gender public.gender;
  taken int;
begin
  select * into s from public.sessions where id = new.session_id for update;
  select gender into member_gender from public.profiles where id = new.user_id;

  if s.status <> 'open' then
    raise exception 'session is not open';
  end if;
  if member_gender is distinct from s.gender then
    raise exception 'member gender does not match session';
  end if;
  if private.is_blocked_between(s.host_id, new.user_id) then
    raise exception 'blocked';
  end if;
  if s.capacity > 0 then
    select count(*) into taken from public.session_members where session_id = s.id;
    if taken >= s.capacity then
      raise exception 'session is full';
    end if;
  end if;
  return new;
end;
$$;

-- Policies run these as the caller, so signed-in users need EXECUTE on them.
revoke execute on all functions in schema private from public, anon;
grant execute on function private.my_gender(), private.is_session_participant(uuid),
  private.session_gender(uuid), private.is_blocked_between(uuid, uuid) to authenticated;

revoke execute on function public.nearby_venues(double precision, double precision, double precision, text) from public, anon;
revoke execute on function public.people_matches(double precision, int) from public, anon;
grant execute on function public.nearby_venues(double precision, double precision, double precision, text) to authenticated;
grant execute on function public.people_matches(double precision, int) to authenticated;
