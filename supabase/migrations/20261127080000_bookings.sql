-- Bookings.
--
-- Phase 1: organise a booking made outside the app (status, total price, who
-- paid, venue phone/website).
-- Phase 2: partner venues publish bookable slots; a session host requests one;
-- the venue owner confirms or declines.
--
-- Separation rule: a venue owner may serve the other gender, so owners never
-- see who booked. Bookings carry only a party size and a code, and owners have
-- no access to sessions, profiles or chats.

-- ---------------------------------------------------------------------------
-- Phase 1: booking details on sessions, payments on members
-- ---------------------------------------------------------------------------

alter table public.sessions
  add column booking_status text not null default 'none' check (booking_status in ('none', 'requested', 'booked')),
  add column booking_note text check (char_length(booking_note) <= 300),
  add column total_price_sar numeric(8, 2) check (total_price_sar >= 0);

alter table public.session_members add column paid_at timestamptz;

-- Members mark their own share paid; the host can mark anyone. Only paid_at
-- may change (column grant), so a member cannot move their row elsewhere.
create policy "members mark paid" on public.session_members for update to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.sessions s where s.id = session_id and s.host_id = auth.uid()))
  with check (user_id = auth.uid() or exists (select 1 from public.sessions s where s.id = session_id and s.host_id = auth.uid()));
revoke update on public.session_members from authenticated;
grant update (paid_at) on public.session_members to authenticated;

alter table public.venues
  add column phone text,
  add column website text;

-- Owners always see their own venues, whoever the venue serves.
create policy "venues owner read" on public.venues for select to authenticated using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Notifications: new kinds, and a booking reference
-- ---------------------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'joined', 'invite', 'cancelled',
  'booked', 'booking_request', 'booking_confirmed', 'booking_declined', 'booking_cancelled'
));
alter table public.notifications add column booking_id uuid;

create or replace function private.notification_text(p_kind text, p_actor text, p_hobby text)
returns text
language sql immutable
set search_path = public
as $$
  select case p_kind
    when 'joined' then coalesce(p_actor, 'أحد') || ' انضم لجلستك'
    when 'invite' then coalesce(p_actor, 'أحد') || ' يدعوك لجلسة'
    when 'cancelled' then 'انلغت جلسة كنت منضم لها'
    when 'booked' then 'تم حجز المكان لجلستك'
    when 'booking_request' then 'طلب حجز جديد لمكانك'
    when 'booking_confirmed' then 'المكان أكد حجزك'
    when 'booking_declined' then 'المكان اعتذر عن الحجز'
    when 'booking_cancelled' then 'انلغى حجز في مكانك'
    else 'إشعار جديد'
  end || coalesce(' · ' || (select name_ar from public.hobbies where id = p_hobby), '')
$$;

create or replace function private.notify(p_user uuid, p_kind text, p_session uuid, p_invite uuid, p_actor text, p_hobby text)
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

-- Notifications for venue owners carry no session (owners cannot open it).
create function private.notify_owner(p_owner uuid, p_kind text, p_booking uuid, p_hobby text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, kind, booking_id, hobby_id) values (p_owner, p_kind, p_booking, p_hobby);
  perform private.send_push(p_owner, 'شلة', private.notification_text(p_kind, null, p_hobby),
    jsonb_build_object('kind', p_kind, 'bookingId', p_booking));
end;
$$;

-- The session is booked (by the host, or by a confirmed venue booking): tell the members.
create function private.on_session_booked()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  m record;
begin
  if new.booking_status = 'booked' and old.booking_status <> 'booked' then
    for m in select user_id from public.session_members where session_id = new.id and user_id <> new.host_id loop
      perform private.notify(m.user_id, 'booked', new.id, null, null, new.hobby_id);
    end loop;
  end if;
  return new;
end;
$$;

create trigger sessions_booked_notify
after update of booking_status on public.sessions
for each row execute function private.on_session_booked();

-- ---------------------------------------------------------------------------
-- Phase 2: claims, slots, bookings
-- ---------------------------------------------------------------------------

create function private.owns_venue(p_venue uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.venues where id = p_venue and owner_id = auth.uid())
$$;

-- A business asks to manage a venue. An admin approves it (sets status), which
-- makes the claimant the owner.
create table public.venue_claims (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_name text not null check (char_length(business_name) between 2 and 80),
  contact text not null check (char_length(contact) between 5 and 80),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (venue_id, user_id)
);

alter table public.venue_claims enable row level security;
create policy "claims own" on public.venue_claims for select to authenticated using (user_id = auth.uid());
create policy "claims submit" on public.venue_claims for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create function private.on_claim_approved()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status <> 'approved' then
    update public.venues set owner_id = new.user_id, verified = true, source = 'owner' where id = new.venue_id;
  end if;
  return new;
end;
$$;

create trigger venue_claims_approved
after update of status on public.venue_claims
for each row execute function private.on_claim_approved();

create table public.venue_slots (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  hobby_id text not null references public.hobbies (id),
  -- Who the slot is for. A shared venue publishes men's and women's slots separately.
  audience public.gender not null,
  starts_at timestamptz not null,
  duration_minutes smallint not null default 60 check (duration_minutes between 15 and 600),
  price_sar numeric(8, 2) not null check (price_sar >= 0),
  status text not null default 'open' check (status in ('open', 'held', 'booked', 'cancelled')),
  created_at timestamptz not null default now()
);

create index venue_slots_lookup on public.venue_slots (venue_id, starts_at);

alter table public.venue_slots enable row level security;
-- Customers see open future slots for their own gender; owners see all of theirs.
create policy "slots for my gender" on public.venue_slots for select to authenticated
  using (
    private.owns_venue(venue_id)
    or (status = 'open' and starts_at > now() and audience = private.my_gender())
  );
create policy "slots owner write" on public.venue_slots for insert to authenticated
  with check (private.owns_venue(venue_id) and status = 'open');
create policy "slots owner update" on public.venue_slots for update to authenticated
  using (private.owns_venue(venue_id)) with check (private.owns_venue(venue_id));
create policy "slots owner delete" on public.venue_slots for delete to authenticated
  using (private.owns_venue(venue_id) and status in ('open', 'cancelled'));

create function private.check_slot()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  aud public.venue_audience;
begin
  select audience into aud from public.venues where id = new.venue_id;
  if aud <> 'both' and aud::text <> new.audience::text then
    raise exception 'venue does not serve this gender';
  end if;
  if not exists (select 1 from public.venue_hobbies where venue_id = new.venue_id and hobby_id = new.hobby_id) then
    raise exception 'venue does not offer this hobby';
  end if;
  return new;
end;
$$;

create trigger venue_slots_check
before insert or update of venue_id, hobby_id, audience on public.venue_slots
for each row execute function private.check_slot();

create table public.venue_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.venue_slots (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  party_size smallint not null default 1,
  code text not null default upper(substr(md5(random()::text), 1, 6)),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  created_at timestamptz not null default now()
);

create unique index venue_bookings_one_active_per_slot on public.venue_bookings (slot_id) where status in ('pending', 'confirmed');

alter table public.venue_bookings enable row level security;
-- The host who asked, and the venue owner, can read a booking. It holds no names.
create policy "bookings parties read" on public.venue_bookings for select to authenticated
  using (requested_by = auth.uid() or private.owns_venue(venue_id));

-- Request a slot for a session you host. Returns the booking id.
create function public.request_booking(p_slot uuid, p_session uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  sl public.venue_slots%rowtype;
  s public.sessions%rowtype;
  bid uuid;
  owner uuid;
begin
  select * into sl from public.venue_slots where id = p_slot for update;
  select * into s from public.sessions where id = p_session for update;
  if s.id is null or s.host_id <> auth.uid() then raise exception 'only the host can book'; end if;
  if s.status <> 'open' then raise exception 'session is not open'; end if;
  if sl.id is null or sl.status <> 'open' or sl.starts_at <= now() then raise exception 'slot is not available'; end if;
  if sl.venue_id <> s.venue_id then raise exception 'slot is at another venue'; end if;
  if sl.audience <> s.gender then raise exception 'slot is for the other side'; end if;
  if s.booking_status <> 'none' then raise exception 'session already has a booking'; end if;

  insert into public.venue_bookings (slot_id, venue_id, session_id, requested_by, party_size)
  values (sl.id, sl.venue_id, s.id, auth.uid(), greatest(1, (select count(*) from public.session_members where session_id = s.id)))
  returning id into bid;
  update public.venue_slots set status = 'held' where id = sl.id;
  update public.sessions set booking_status = 'requested' where id = s.id;

  select owner_id into owner from public.venues where id = sl.venue_id;
  if owner is not null then perform private.notify_owner(owner, 'booking_request', bid, sl.hobby_id); end if;
  return bid;
end;
$$;

-- The venue owner accepts or declines a pending booking.
create function public.respond_booking(p_booking uuid, p_accept boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  b public.venue_bookings%rowtype;
  sl public.venue_slots%rowtype;
begin
  select * into b from public.venue_bookings where id = p_booking for update;
  if b.id is null or not private.owns_venue(b.venue_id) then raise exception 'not your venue'; end if;
  if b.status <> 'pending' then raise exception 'booking already answered'; end if;
  select * into sl from public.venue_slots where id = b.slot_id;

  if p_accept then
    update public.venue_bookings set status = 'confirmed' where id = b.id;
    update public.venue_slots set status = 'booked' where id = sl.id;
    update public.sessions set
      starts_at = sl.starts_at,
      duration_minutes = sl.duration_minutes,
      total_price_sar = sl.price_sar,
      booking_note = 'رمز الحجز: ' || b.code,
      booking_status = 'booked'
    where id = b.session_id;
    perform private.notify(b.requested_by, 'booking_confirmed', b.session_id, null, null, sl.hobby_id);
  else
    update public.venue_bookings set status = 'declined' where id = b.id;
    update public.venue_slots set status = 'open' where id = sl.id;
    update public.sessions set booking_status = 'none' where id = b.session_id;
    perform private.notify(b.requested_by, 'booking_declined', b.session_id, null, null, sl.hobby_id);
  end if;
end;
$$;

-- The host cancels their booking (pending or confirmed).
create function public.cancel_booking(p_booking uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  b public.venue_bookings%rowtype;
  owner uuid;
  hobby text;
begin
  select * into b from public.venue_bookings where id = p_booking for update;
  if b.id is null or b.requested_by <> auth.uid() then raise exception 'not your booking'; end if;
  if b.status not in ('pending', 'confirmed') then raise exception 'booking is not active'; end if;
  update public.venue_bookings set status = 'cancelled' where id = b.id;
  update public.venue_slots set status = 'open' where id = b.slot_id returning hobby_id into hobby;
  update public.sessions set booking_status = 'none', booking_note = null where id = b.session_id;
  select owner_id into owner from public.venues where id = b.venue_id;
  if owner is not null then perform private.notify_owner(owner, 'booking_cancelled', b.id, hobby); end if;
end;
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on function private.my_gender(), private.is_session_participant(uuid),
  private.session_gender(uuid), private.is_blocked_between(uuid, uuid), private.owns_venue(uuid) to authenticated;
revoke execute on function public.request_booking(uuid, uuid), public.respond_booking(uuid, boolean),
  public.cancel_booking(uuid) from public, anon;
grant execute on function public.request_booking(uuid, uuid), public.respond_booking(uuid, boolean),
  public.cancel_booking(uuid) to authenticated;
