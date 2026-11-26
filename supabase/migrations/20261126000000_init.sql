-- Shilla initial schema.
--
-- The core rule: the women's and men's sides of the app never see each other.
-- That rule is enforced HERE, with row-level security and triggers, so that
-- no client bug or modified app can bypass it. The app's own filtering is only
-- a second layer.
--
-- Exact user locations are never readable by other users. Distances to people
-- are computed by security-definer functions and rounded.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.gender as enum ('m', 'f');
create type public.venue_audience as enum ('m', 'f', 'both');
create type public.session_kind as enum ('meetup', 'workshop');
create type public.session_status as enum ('open', 'cancelled', 'done');

-- ---------------------------------------------------------------------------
-- Hobby catalog (data, not code: add a hobby by inserting a row)
-- ---------------------------------------------------------------------------

create table public.hobby_categories (
  id text primary key,
  name_ar text not null,
  sort smallint not null default 0
);

create table public.hobbies (
  id text primary key,
  category_id text not null references public.hobby_categories (id),
  name_ar text not null,
  emoji text not null,
  -- Typical group size; 0 means an open group with no cap.
  group_size smallint not null default 0 check (group_size >= 0),
  teams boolean not null default false,
  group_label_ar text not null,
  -- Three level labels from beginner to advanced; null means the defaults.
  level_labels_ar text[] check (level_labels_ar is null or cardinality(level_labels_ar) = 3),
  active boolean not null default true,
  sort smallint not null default 0
);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 2 and 20),
  -- Comes from identity verification. Immutable (see trigger below).
  gender public.gender not null,
  birth_year smallint check (birth_year between 1920 and 2015),
  city text not null default 'الرياض',
  district text,
  hide_photo boolean not null default false,
  first_name_only boolean not null default false,
  avatar_path text,
  verification_method text not null default 'phone' check (verification_method in ('phone', 'nafath')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- Exact location lives apart from profiles so that no policy can expose it.
create table public.user_locations (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  location extensions.geography(point, 4326) not null,
  updated_at timestamptz not null default now()
);

create table public.user_hobbies (
  user_id uuid not null references public.profiles (id) on delete cascade,
  hobby_id text not null references public.hobbies (id),
  level smallint not null default 0 check (level between 0 and 2),
  primary key (user_id, hobby_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ---------------------------------------------------------------------------
-- Venues
-- ---------------------------------------------------------------------------

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null,
  city text not null default 'الرياض',
  district text,
  location extensions.geography(point, 4326) not null,
  -- Google Places does not know this; it is curated by us or the venue owner.
  audience public.venue_audience not null,
  men_hours text,
  women_hours text,
  price_label text,
  rating numeric(2, 1) check (rating between 0 and 5),
  google_place_id text unique,
  -- Studio or academy account that may post workshops here.
  owner_id uuid references public.profiles (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index venues_location_idx on public.venues using gist (location);

create table public.venue_hobbies (
  venue_id uuid not null references public.venues (id) on delete cascade,
  hobby_id text not null references public.hobbies (id),
  primary key (venue_id, hobby_id)
);

-- ---------------------------------------------------------------------------
-- Sessions, members, messages
-- ---------------------------------------------------------------------------

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  kind public.session_kind not null default 'meetup',
  -- Every session belongs to exactly one side of the app.
  gender public.gender not null,
  hobby_id text not null references public.hobbies (id),
  venue_id uuid not null references public.venues (id),
  host_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  duration_minutes smallint check (duration_minutes > 0),
  level smallint not null default 1 check (level between 0 and 2),
  -- 0 means an open group. For workshops this is the number of seats.
  capacity smallint not null default 0 check (capacity >= 0),
  price_sar numeric(8, 2) check (price_sar >= 0),
  notes text,
  status public.session_status not null default 'open',
  created_at timestamptz not null default now(),
  check (kind = 'meetup' or (price_sar is not null and capacity > 0))
);

create index sessions_feed_idx on public.sessions (gender, status, starts_at);

create table public.session_members (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table public.messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_session_idx on public.messages (session_id, created_at);

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer: they read rows RLS would hide)
-- ---------------------------------------------------------------------------

create function public.my_gender()
returns public.gender
language sql stable security definer
set search_path = public
as $$
  select gender from public.profiles where id = auth.uid()
$$;

create function public.is_session_participant(p_session uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.sessions where id = p_session and host_id = auth.uid())
      or exists (select 1 from public.session_members where session_id = p_session and user_id = auth.uid())
$$;

create function public.session_gender(p_session uuid)
returns public.gender
language sql stable security definer
set search_path = public
as $$
  select gender from public.sessions where id = p_session
$$;

-- True when either user has blocked the other. Reads both directions, which
-- the blocks table's own policy would hide from the blocked user.
create function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

-- Gender can never change after the profile exists.
create function public.prevent_gender_change()
returns trigger
language plpgsql
as $$
begin
  if new.gender is distinct from old.gender then
    raise exception 'gender cannot be changed';
  end if;
  return new;
end;
$$;

create trigger profiles_gender_immutable
before update on public.profiles
for each row execute function public.prevent_gender_change();

-- A session's gender must match its host, and its venue must serve that gender.
create function public.check_session()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  host_gender public.gender;
  aud public.venue_audience;
begin
  select gender into host_gender from public.profiles where id = new.host_id;
  select audience into aud from public.venues where id = new.venue_id;

  if new.kind = 'meetup' and new.gender is distinct from host_gender then
    raise exception 'meetup gender must match host gender';
  end if;
  if new.kind = 'workshop' and not exists (
    select 1 from public.venues where id = new.venue_id and owner_id = new.host_id
  ) then
    raise exception 'only the venue owner can post workshops';
  end if;
  if aud <> 'both' and aud::text <> new.gender::text then
    raise exception 'venue does not serve this gender';
  end if;
  if not exists (select 1 from public.venue_hobbies where venue_id = new.venue_id and hobby_id = new.hobby_id) then
    raise exception 'venue does not offer this hobby';
  end if;
  return new;
end;
$$;

create trigger sessions_check
before insert or update of gender, host_id, venue_id, hobby_id, kind on public.sessions
for each row execute function public.check_session();

-- Members must be the session's gender, and capacity is enforced.
create function public.check_membership()
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
  if public.is_blocked_between(s.host_id, new.user_id) then
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

create trigger session_members_check
before insert on public.session_members
for each row execute function public.check_membership();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.hobby_categories enable row level security;
alter table public.hobbies enable row level security;
alter table public.profiles enable row level security;
alter table public.user_locations enable row level security;
alter table public.user_hobbies enable row level security;
alter table public.blocks enable row level security;
alter table public.venues enable row level security;
alter table public.venue_hobbies enable row level security;
alter table public.sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;

-- Catalog: readable by everyone, written only by admins (service role).
create policy "catalog readable" on public.hobby_categories for select using (true);
create policy "hobbies readable" on public.hobbies for select using (true);
create policy "venue hobbies readable" on public.venue_hobbies for select using (true);

-- Profiles: you see yourself and people of your own gender who have not blocked you.
create policy "profiles same gender" on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or (gender = public.my_gender() and not public.is_blocked_between(id, auth.uid()))
  );
create policy "profiles insert self" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles update self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Locations: only your own row. Nobody else can ever select it.
create policy "location own" on public.user_locations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Hobbies of people: visible when that person is visible to you.
create policy "user hobbies visible" on public.user_hobbies for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = user_hobbies.user_id));
create policy "user hobbies own" on public.user_hobbies for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "blocks own" on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- Venues: only those that serve your gender.
create policy "venues for my gender" on public.venues for select to authenticated
  using (active and (audience = 'both' or audience::text = public.my_gender()::text));
create policy "venues owner update" on public.venues for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Sessions: only your gender's side.
create policy "sessions my gender" on public.sessions for select to authenticated
  using (gender = public.my_gender());
create policy "sessions create" on public.sessions for insert to authenticated
  with check (host_id = auth.uid() and gender = public.my_gender());
create policy "sessions host update" on public.sessions for update to authenticated
  using (host_id = auth.uid()) with check (host_id = auth.uid() and gender = public.my_gender());

-- Members: visible within your side; you can only add or remove yourself.
create policy "members my gender" on public.session_members for select to authenticated
  using (public.session_gender(session_id) = public.my_gender());
create policy "members join self" on public.session_members for insert to authenticated
  with check (user_id = auth.uid() and public.session_gender(session_id) = public.my_gender());
create policy "members leave self" on public.session_members for delete to authenticated
  using (user_id = auth.uid());

-- Messages: only the session's host and members.
create policy "messages participants read" on public.messages for select to authenticated
  using (public.is_session_participant(session_id));
create policy "messages participants write" on public.messages for insert to authenticated
  with check (author_id = auth.uid() and public.is_session_participant(session_id));

-- Reports: anyone can file; only admins (service role) read them.
create policy "reports file" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Read APIs (call with supabase.rpc)
-- ---------------------------------------------------------------------------

-- Venues near a point that serve the caller's gender, optionally for one hobby.
create function public.nearby_venues(lat double precision, lng double precision, radius_km double precision default 15, p_hobby text default null)
returns table (
  id uuid, name text, kind text, district text, audience public.venue_audience,
  men_hours text, women_hours text, price_label text, rating numeric,
  hobbies text[], distance_km double precision
)
language sql stable security invoker
set search_path = public, extensions
as $$
  select v.id, v.name, v.kind, v.district, v.audience, v.men_hours, v.women_hours, v.price_label, v.rating,
         array(select vh.hobby_id from public.venue_hobbies vh where vh.venue_id = v.id order by vh.hobby_id),
         round((st_distance(v.location, st_makepoint(lng, lat)::geography) / 1000)::numeric, 1)::double precision
  from public.venues v
  where st_dwithin(v.location, st_makepoint(lng, lat)::geography, radius_km * 1000)
    and (p_hobby is null or exists (select 1 from public.venue_hobbies vh where vh.venue_id = v.id and vh.hobby_id = p_hobby))
  order by 11
$$;

-- People of the caller's gender who share at least one hobby, ranked by score.
-- Distance is rounded to whole kilometres and capped at radius_km.
create function public.people_matches(radius_km double precision default 15, max_rows int default 50)
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
      and not public.is_blocked_between(me.id, o.id)
    group by o.id, o.first_name, ol.location, me.location
  )
  select id, first_name, shared, greatest(1, round(km))::int,
         least(98, greatest(55, round(70 + cardinality(shared) * 9 - level_gap * 8 - km * 2)))::int
  from candidates
  order by 5 desc
  limit max_rows
$$;

grant execute on function public.nearby_venues(double precision, double precision, double precision, text) to authenticated;
grant execute on function public.people_matches(double precision, int) to authenticated;
