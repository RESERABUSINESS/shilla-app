-- Invites, in-app notifications, push notifications, notification settings,
-- venue provenance, and account deletion.
--
-- Separation rule: invites and notifications only ever connect people of the
-- same gender, because they hang off sessions, which are single-gender, and
-- the invite trigger checks both people against the session.

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Settings and venue provenance
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column notify_push boolean not null default true,
  add column notify_messages boolean not null default true,
  add column notify_reminders boolean not null default true;

alter table public.venues
  add column verified boolean not null default false,
  add column source text not null default 'manual' check (source in ('manual', 'osm', 'owner')),
  add column osm_id text unique,
  add column address text;

-- ---------------------------------------------------------------------------
-- Push tokens
-- ---------------------------------------------------------------------------

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;
create policy "push tokens own" on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Invites
-- ---------------------------------------------------------------------------

create type public.invite_status as enum ('pending', 'accepted', 'declined');

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  status public.invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (session_id, to_id),
  check (from_id <> to_id)
);

alter table public.invites enable row level security;
create policy "invites own" on public.invites for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());
create policy "invites send" on public.invites for insert to authenticated
  with check (from_id = auth.uid());
create policy "invites answer" on public.invites for update to authenticated
  using (to_id = auth.uid()) with check (to_id = auth.uid());

create function private.check_invite()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  s public.sessions%rowtype;
  from_gender public.gender;
  to_gender public.gender;
begin
  select * into s from public.sessions where id = new.session_id;
  select gender into from_gender from public.profiles where id = new.from_id;
  select gender into to_gender from public.profiles where id = new.to_id;

  if s.status <> 'open' then
    raise exception 'session is not open';
  end if;
  if from_gender is distinct from s.gender or to_gender is distinct from s.gender then
    raise exception 'invite gender does not match session';
  end if;
  if not (s.host_id = new.from_id or exists (
    select 1 from public.session_members where session_id = s.id and user_id = new.from_id
  )) then
    raise exception 'only participants can invite';
  end if;
  if private.is_blocked_between(new.from_id, new.to_id) then
    raise exception 'blocked';
  end if;
  if exists (select 1 from public.session_members where session_id = s.id and user_id = new.to_id) then
    raise exception 'already a member';
  end if;
  return new;
end;
$$;

create trigger invites_check
before insert on public.invites
for each row execute function private.check_invite();

-- ---------------------------------------------------------------------------
-- In-app notifications (written only by triggers)
-- ---------------------------------------------------------------------------

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('joined', 'invite', 'cancelled')),
  session_id uuid references public.sessions (id) on delete cascade,
  invite_id uuid references public.invites (id) on delete cascade,
  actor_name text,
  hobby_id text references public.hobbies (id),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
create policy "notifications own" on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notifications mark read" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Arabic text for a notification, shared by the feed and push.
create function private.notification_text(p_kind text, p_actor text, p_hobby text)
returns text
language sql immutable
as $$
  select case p_kind
    when 'joined' then coalesce(p_actor, 'أحد') || ' انضم لجلستك'
    when 'invite' then coalesce(p_actor, 'أحد') || ' يدعوك لجلسة'
    when 'cancelled' then 'انلغت جلسة كنت منضم لها'
    else 'إشعار جديد'
  end || coalesce(' · ' || (select name_ar from public.hobbies where id = p_hobby), '')
$$;

-- Sends an Expo push notification to every device of a user who allows push.
create function private.send_push(p_user uuid, p_title text, p_body text, p_data jsonb)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  msgs jsonb;
begin
  select jsonb_agg(jsonb_build_object('to', t.token, 'title', p_title, 'body', p_body, 'data', p_data, 'sound', 'default'))
    into msgs
  from public.push_tokens t
  join public.profiles p on p.id = t.user_id
  where t.user_id = p_user and p.notify_push;

  if msgs is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := msgs,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end if;
end;
$$;

create function private.notify(p_user uuid, p_kind text, p_session uuid, p_invite uuid, p_actor text, p_hobby text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, kind, session_id, invite_id, actor_name, hobby_id)
  values (p_user, p_kind, p_session, p_invite, p_actor, p_hobby);
  perform private.send_push(p_user, 'شلة', private.notification_text(p_kind, p_actor, p_hobby),
    jsonb_build_object('sessionId', p_session, 'kind', p_kind));
end;
$$;

-- Someone joined: tell the host.
create function private.on_member_joined()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  s public.sessions%rowtype;
  who text;
begin
  select * into s from public.sessions where id = new.session_id;
  if s.host_id <> new.user_id then
    select first_name into who from public.profiles where id = new.user_id;
    perform private.notify(s.host_id, 'joined', s.id, null, who, s.hobby_id);
  end if;
  -- Joining answers any pending invite to this session.
  update public.invites set status = 'accepted' where session_id = s.id and to_id = new.user_id and status = 'pending';
  return new;
end;
$$;

create trigger session_members_notify
after insert on public.session_members
for each row execute function private.on_member_joined();

-- New invite: tell the invitee.
create function private.on_invite()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  who text;
  hobby text;
begin
  select first_name into who from public.profiles where id = new.from_id;
  select hobby_id into hobby from public.sessions where id = new.session_id;
  perform private.notify(new.to_id, 'invite', new.session_id, new.id, who, hobby);
  return new;
end;
$$;

create trigger invites_notify
after insert on public.invites
for each row execute function private.on_invite();

-- Session cancelled: tell every member except the host.
create function private.on_session_cancelled()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  m record;
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    for m in select user_id from public.session_members where session_id = new.id and user_id <> new.host_id loop
      perform private.notify(m.user_id, 'cancelled', new.id, null, null, new.hobby_id);
    end loop;
  end if;
  return new;
end;
$$;

create trigger sessions_cancel_notify
after update of status on public.sessions
for each row execute function private.on_session_cancelled();

-- New chat message: push to the other participants who allow message alerts.
create function private.on_message()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  s public.sessions%rowtype;
  who text;
  r record;
begin
  select * into s from public.sessions where id = new.session_id;
  select first_name into who from public.profiles where id = new.author_id;
  for r in
    select distinct u.user_id from (
      select user_id from public.session_members where session_id = s.id
      union select s.host_id
    ) u
    join public.profiles p on p.id = u.user_id
    where u.user_id <> new.author_id and p.notify_messages
  loop
    perform private.send_push(r.user_id, coalesce(who, 'شلة'), left(new.body, 140),
      jsonb_build_object('sessionId', s.id, 'kind', 'message'));
  end loop;
  return new;
end;
$$;

create trigger messages_push
after insert on public.messages
for each row execute function private.on_message();

-- ---------------------------------------------------------------------------
-- Account deletion (required by the App Store)
-- ---------------------------------------------------------------------------

create function public.delete_my_account()
returns void
language sql security definer
set search_path = public
as $$
  delete from auth.users where id = auth.uid()
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on function private.my_gender(), private.is_session_participant(uuid),
  private.session_gender(uuid), private.is_blocked_between(uuid, uuid) to authenticated;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
