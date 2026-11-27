-- Safety and trust: blocking hides a person's sessions and messages too, a
-- list of the people you blocked, and session ratings that roll up into the
-- venue's rating.

-- Sessions hosted by someone you blocked (or who blocked you) disappear.
drop policy "sessions my gender" on public.sessions;
create policy "sessions my gender" on public.sessions for select to authenticated
  using (gender = private.my_gender() and not private.is_blocked_between(host_id, auth.uid()));

-- Their messages disappear from shared chats.
drop policy "messages participants read" on public.messages;
create policy "messages participants read" on public.messages for select to authenticated
  using (private.is_session_participant(session_id) and not private.is_blocked_between(author_id, auth.uid()));

-- The people you blocked, with their names (their profiles are hidden by RLS).
create function public.my_blocks()
returns table (user_id uuid, first_name text, blocked_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  select b.blocked_id, p.first_name, b.created_at
  from public.blocks b join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc
$$;

revoke execute on function public.my_blocks() from public, anon;
grant execute on function public.my_blocks() to authenticated;

-- Ratings: members rate a session once it has started.
alter table public.venues add column rating_count integer not null default 0;

create table public.session_ratings (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

alter table public.session_ratings enable row level security;
create policy "ratings own" on public.session_ratings for select to authenticated
  using (user_id = auth.uid());
create policy "ratings by members after start" on public.session_ratings for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.session_members m join public.sessions s on s.id = m.session_id
      where m.session_id = session_ratings.session_id and m.user_id = auth.uid() and s.starts_at < now()
    )
  );

-- Keep each venue's average rating current.
create function private.update_venue_rating()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  vid uuid;
begin
  select venue_id into vid from public.sessions where id = new.session_id;
  update public.venues v set
    rating = sub.avg_stars,
    rating_count = sub.n
  from (
    select round(avg(r.stars)::numeric, 1) as avg_stars, count(*)::int as n
    from public.session_ratings r join public.sessions s on s.id = r.session_id
    where s.venue_id = vid
  ) sub
  where v.id = vid;
  return new;
end;
$$;

create trigger session_ratings_venue
after insert on public.session_ratings
for each row execute function private.update_venue_rating();

revoke execute on all functions in schema private from public, anon;
grant execute on function private.my_gender(), private.is_session_participant(uuid),
  private.session_gender(uuid), private.is_blocked_between(uuid, uuid) to authenticated;
