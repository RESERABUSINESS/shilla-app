-- Gender-separation and privacy checks. Each failure raises an exception.
-- Users: f1, f2, f3 = women; f9 = women's pottery studio owner; a1, a2 = men.

\set f1 '''00000000-0000-0000-0000-0000000000f1'''
\set f2 '''00000000-0000-0000-0000-0000000000f2'''
\set f3 '''00000000-0000-0000-0000-0000000000f3'''
\set f9 '''00000000-0000-0000-0000-0000000000f9'''
\set a1 '''00000000-0000-0000-0000-0000000000a1'''
\set a2 '''00000000-0000-0000-0000-0000000000a2'''

-- Fixtures (as superuser) --------------------------------------------------
insert into auth.users (id) values (:f1), (:f2), (:f3), (:f9), (:a1), (:a2);
insert into public.profiles (id, first_name, gender) values
  (:f1, 'نورة', 'f'), (:f2, 'ريم', 'f'), (:f3, 'جود', 'f'), (:f9, 'استوديو طين', 'f'),
  (:a1, 'فهد', 'm'), (:a2, 'سعود', 'm');
insert into public.user_locations (user_id, location) values
  (:f1, st_makepoint(46.630, 24.800)::geography), (:f2, st_makepoint(46.640, 24.810)::geography),
  (:f3, st_makepoint(46.650, 24.790)::geography), (:a1, st_makepoint(46.631, 24.801)::geography),
  (:a2, st_makepoint(46.660, 24.820)::geography);
insert into public.user_hobbies values
  (:f1, 'padel', 1), (:f1, 'pottery', 0), (:f2, 'padel', 2), (:f3, 'reading', 1),
  (:a1, 'padel', 1), (:a2, 'padel', 1);

insert into public.venues (id, name, kind, location, audience, owner_id) values
  ('10000000-0000-0000-0000-000000000001', 'بادل مشترك', 'ملاعب', st_makepoint(46.635, 24.805)::geography, 'both', null),
  ('10000000-0000-0000-0000-000000000002', 'ملعب رجالي', 'ملعب', st_makepoint(46.645, 24.795)::geography, 'm', null),
  ('10000000-0000-0000-0000-000000000003', 'استوديو طين', 'استوديو', st_makepoint(46.632, 24.802)::geography, 'f', :f9);
insert into public.venue_hobbies values
  ('10000000-0000-0000-0000-000000000001', 'padel'),
  ('10000000-0000-0000-0000-000000000002', 'football'),
  ('10000000-0000-0000-0000-000000000003', 'pottery');

-- Women's padel meetup (capacity 2) hosted by f1; men's padel meetup hosted by a1.
insert into public.sessions (id, gender, hobby_id, venue_id, host_id, starts_at, capacity) values
  ('20000000-0000-0000-0000-000000000001', 'f', 'padel', '10000000-0000-0000-0000-000000000001', :f1, now() + interval '2 days', 2),
  ('20000000-0000-0000-0000-000000000002', 'm', 'padel', '10000000-0000-0000-0000-000000000001', :a1, now() + interval '2 days', 4);
insert into public.messages (session_id, author_id, body) values
  ('20000000-0000-0000-0000-000000000001', :f1, 'رسالة البنات'),
  ('20000000-0000-0000-0000-000000000002', :a1, 'رسالة الشباب');

-- As woman f2 ---------------------------------------------------------------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';

do $$ begin
  assert (select count(*) from public.sessions) = 1, 'woman must see exactly the one women''s session';
  assert (select count(*) from public.sessions where gender = 'm') = 0, 'woman must not see men''s sessions';
  assert (select count(*) from public.profiles where gender = 'm') = 0, 'woman must not see men''s profiles';
  assert (select count(*) from public.user_hobbies where user_id = '00000000-0000-0000-0000-0000000000a1') = 0, 'woman must not see men''s hobbies';
  assert (select count(*) from public.venues where audience = 'm') = 0, 'woman must not see men-only venues';
  assert (select count(*) from public.venues) = 2, 'woman sees the shared venue and the women''s studio';
  assert (select count(*) from public.user_locations) = 1, 'users see only their own location';
  assert (select count(*) from public.messages) = 0, 'non-members cannot read session chat';
end $$;

-- Joining the men's session must fail.
do $$ begin
  insert into public.session_members values ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f2', now());
  raise exception 'SHOULD FAIL: woman joined men''s session';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;

-- Adding someone else must fail.
do $$ begin
  insert into public.session_members values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f3', now());
  raise exception 'SHOULD FAIL: added another user';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;

-- Joining the women's session works, and then the chat is readable.
insert into public.session_members (session_id, user_id) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f2');
insert into public.messages (session_id, author_id, body) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f2', 'هلا');
do $$ begin
  assert (select count(*) from public.messages) = 2, 'member reads her session chat only';
end $$;

-- Changing gender must fail.
do $$ begin
  update public.profiles set gender = 'm' where id = '00000000-0000-0000-0000-0000000000f2';
  raise exception 'SHOULD FAIL: gender changed';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;

-- Creating a men's session or a session at a men-only venue must fail.
do $$ begin
  insert into public.sessions (gender, hobby_id, venue_id, host_id, starts_at)
  values ('m', 'padel', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f2', now());
  raise exception 'SHOULD FAIL: woman created men''s session';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;
do $$ begin
  insert into public.sessions (gender, hobby_id, venue_id, host_id, starts_at)
  values ('f', 'football', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f2', now());
  raise exception 'SHOULD FAIL: session at men-only venue';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;

-- A workshop from someone who does not own the venue must fail.
do $$ begin
  insert into public.sessions (kind, gender, hobby_id, venue_id, host_id, starts_at, capacity, price_sar)
  values ('workshop', 'f', 'pottery', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000f2', now(), 8, 250);
  raise exception 'SHOULD FAIL: non-owner posted workshop';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;

-- Matching returns only women who share a hobby, with rounded distances.
do $$
declare r record;
begin
  assert (select count(*) from public.people_matches()) = 1, 'f2 matches exactly one woman (f1, padel)';
  select * into r from public.people_matches() limit 1;
  assert r.user_id = '00000000-0000-0000-0000-0000000000f1', 'match is f1';
  assert r.shared_hobbies = array['padel'], 'shared hobby is padel';
  assert r.distance_km >= 1, 'distance is rounded to at least 1 km';
  assert (select count(*) from public.nearby_venues(24.80, 46.63)) = 2, 'nearby venues respect gender';
end $$;

-- Fill the women's session (capacity 2): f2 joined above, now add the host f1 as a member.
reset role;
insert into public.session_members (session_id, user_id) values ('20000000-0000-0000-0000-000000000001', :f1);
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f3';
do $$ begin
  insert into public.session_members (session_id, user_id) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f3');
  raise exception 'SHOULD FAIL: joined a full session';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;

-- As the studio owner f9: posting a workshop at her own studio works.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f9';
insert into public.sessions (kind, gender, hobby_id, venue_id, host_id, starts_at, capacity, price_sar)
values ('workshop', 'f', 'pottery', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000f9', now() + interval '3 days', 8, 250);

-- As man a2 ------------------------------------------------------------------
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
do $$ begin
  assert (select count(*) from public.sessions) = 1, 'man sees only the men''s session';
  assert (select count(*) from public.profiles where gender = 'f') = 0, 'man must not see women';
  assert (select count(*) from public.venues where audience = 'f') = 0, 'man must not see women-only venues';
  assert (select count(*) from public.people_matches()) = 1, 'a2 matches a1 only';
end $$;

-- Blocking: after a1 blocks a2, they no longer see each other.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
insert into public.blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
do $$ begin
  assert (select count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') = 0, 'blocked users are hidden';
  assert (select count(*) from public.people_matches()) = 0, 'blocked users are not matched';
end $$;
reset role;

-- Social: notifications, invites, push, cancel, delete -----------------------
\set s1 '''20000000-0000-0000-0000-000000000001'''
insert into public.push_tokens (token, user_id) values ('ExponentPushToken[f3-device]', :f3);

-- The host was notified when f2 joined her session.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$ begin
  assert (select count(*) from public.notifications where kind = 'joined') = 1, 'host gets a joined notification';
end $$;

-- f2 (a member) invites f3: allowed. Inviting a man is not.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
insert into public.invites (session_id, from_id, to_id)
values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f3');
do $$ begin
  insert into public.invites (session_id, from_id, to_id)
  values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a2');
  raise exception 'SHOULD FAIL: woman invited a man';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;
do $$ begin
  insert into public.invites (session_id, from_id, to_id)
  values ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f9');
  raise exception 'SHOULD FAIL: invited to a session of the other side';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;
do $$ begin
  assert (select count(*) from public.notifications) = 0, 'f2 sees no one else''s notifications';
end $$;

-- f3 sees the invite and its notification, and can decline it.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f3';
do $$ begin
  assert (select count(*) from public.invites where status = 'pending') = 1, 'invitee sees the invite';
  assert (select count(*) from public.notifications where kind = 'invite') = 1, 'invitee is notified';
end $$;
update public.invites set status = 'declined' where to_id = '00000000-0000-0000-0000-0000000000f3';

-- A man sees none of this.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  assert (select count(*) from public.invites) = 0, 'men see no women''s invites';
  assert (select count(*) from public.notifications) = 0, 'men see no women''s notifications';
end $$;

-- The host cancels; members are notified.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
update public.sessions set status = 'cancelled' where id = '20000000-0000-0000-0000-000000000001';
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
do $$ begin
  assert (select count(*) from public.notifications where kind = 'cancelled') = 1, 'members hear about cancellation';
end $$;

-- f3 deletes her account.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f3';
select public.delete_my_account();
reset role;
do $$ begin
  assert (select count(*) from net._calls where body::text like '%f3-device%') >= 1, 'push was sent to the invitee''s device';
  assert (select count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000f3') = 0, 'account deletion removes the profile';
  assert (select count(*) from public.push_tokens where user_id = '00000000-0000-0000-0000-0000000000f3') = 0, 'and the push tokens';
end $$;

-- Venue suggestions -----------------------------------------------------------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select public.suggest_venue('ملعب بادل الحي', 'ملعب بادل', 24.80, 46.63, 'm', array['padel']) is not null as suggested;
do $$ begin
  assert (select count(*) from public.venues where source = 'user' and not verified) = 1, 'suggestion is visible and unverified';
  insert into public.venues (name, kind, location, audience, source, verified, created_by)
  values ('x', 'y', st_makepoint(46.6, 24.8)::geography, 'both', 'user', true, '00000000-0000-0000-0000-0000000000a1');
  raise exception 'SHOULD FAIL: user marked own venue verified';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;
do $$ begin
  insert into public.venue_hobbies values ('10000000-0000-0000-0000-000000000001', 'chess');
  raise exception 'SHOULD FAIL: added a hobby to someone else''s venue';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;
reset role;

-- my_location returns only the caller's own location.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$ begin
  assert (select count(*) from public.my_location()) = 1, 'own location is returned';
  assert (select round(lat::numeric, 2) from public.my_location()) = 24.80, 'it is f1''s location';
end $$;
reset role;

-- Safety: blocking hides sessions and messages; ratings -----------------------
reset role;
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000f4'), ('00000000-0000-0000-0000-0000000000f5');
insert into public.profiles (id, first_name, gender) values
  ('00000000-0000-0000-0000-0000000000f4', 'هند', 'f'), ('00000000-0000-0000-0000-0000000000f5', 'وعد', 'f');
-- f4 hosts a session that already started; f5 is a member and has chatted.
insert into public.sessions (id, gender, hobby_id, venue_id, host_id, starts_at, capacity) values
  ('20000000-0000-0000-0000-000000000004', 'f', 'padel', '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-0000000000f4', now() - interval '2 hours', 4);
insert into public.session_members (session_id, user_id) values
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000f4'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000f5');
insert into public.messages (session_id, author_id, body) values
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000f4', 'رسالة هند');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f5';
do $$ begin
  assert (select count(*) from public.messages where session_id = '20000000-0000-0000-0000-000000000004') = 1, 'member reads the chat';
end $$;

-- f5 rates the finished session; the venue rating updates. Rating twice fails.
insert into public.session_ratings (session_id, user_id, stars)
values ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000f5', 4);
do $$ begin
  assert (select rating from public.venues where id = '10000000-0000-0000-0000-000000000001') = 4.0, 'venue rating updated';
  assert (select rating_count from public.venues where id = '10000000-0000-0000-0000-000000000001') = 1, 'rating count updated';
  insert into public.session_ratings (session_id, user_id, stars)
  values ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000f5', 5);
  raise exception 'SHOULD FAIL: rated twice';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;

-- Non-members cannot rate, and nobody can rate a session that has not started.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
do $$ begin
  insert into public.session_ratings (session_id, user_id, stars)
  values ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000f2', 5);
  raise exception 'SHOULD FAIL: non-member rated';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;

-- f5 blocks f4: f4's session and messages disappear, and my_blocks lists her.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f5';
insert into public.blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000f4');
do $$ begin
  assert (select count(*) from public.sessions where id = '20000000-0000-0000-0000-000000000004') = 0, 'blocked host''s session is hidden';
  assert (select count(*) from public.messages where author_id = '00000000-0000-0000-0000-0000000000f4') = 0, 'blocked person''s messages are hidden';
  assert (select first_name from public.my_blocks() limit 1) = 'هند', 'my_blocks lists the blocked person';
end $$;
-- And f4 no longer sees f5 either.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f4';
do $$ begin
  assert (select count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000f5') = 0, 'blocking hides both ways';
end $$;
-- Unblocking brings things back.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f5';
delete from public.blocks where blocked_id = '00000000-0000-0000-0000-0000000000f4';
do $$ begin
  assert (select count(*) from public.sessions where id = '20000000-0000-0000-0000-000000000004') = 1, 'unblock restores the session';
end $$;
reset role;

-- Bookings ---------------------------------------------------------------------
-- a2 (a man) claims the shared padel venue; an admin approves.
reset role;
insert into public.venue_claims (venue_id, user_id, business_name, contact)
values ('10000000-0000-0000-0000-000000000001', :a2, 'نادي البادل', '0500000000');
update public.venue_claims set status = 'approved' where user_id = :a2;
-- f2 hosts a future women's padel session there; f1 joins.
insert into public.sessions (id, gender, hobby_id, venue_id, host_id, starts_at, capacity) values
  ('20000000-0000-0000-0000-000000000005', 'f', 'padel', '10000000-0000-0000-0000-000000000001', :f2, now() + interval '3 days', 4);
insert into public.session_members (session_id, user_id) values
  ('20000000-0000-0000-0000-000000000005', :f2), ('20000000-0000-0000-0000-000000000005', :f1);

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
do $$ begin
  assert (select owner_id from public.venues where id = '10000000-0000-0000-0000-000000000001') = '00000000-0000-0000-0000-0000000000a2', 'approved claim makes an owner';
  assert (select count(*) from public.sessions where id = '20000000-0000-0000-0000-000000000005') = 0, 'owner cannot see the women''s session';
end $$;
insert into public.venue_slots (id, venue_id, hobby_id, audience, starts_at, duration_minutes, price_sar) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'padel', 'f', now() + interval '4 days', 90, 200);

-- The owner of a women-only venue cannot publish men's slots.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f9';
do $$ begin
  insert into public.venue_slots (venue_id, hobby_id, audience, starts_at, price_sar)
  values ('10000000-0000-0000-0000-000000000003', 'pottery', 'm', now() + interval '1 day', 100);
  raise exception 'SHOULD FAIL: men''s slot at a women-only venue';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;

-- Men do not see women's slots; women do.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  assert (select count(*) from public.venue_slots) = 0, 'men do not see women''s slots';
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$ begin
  assert (select count(*) from public.venue_slots) = 1, 'women see the open women''s slot';
  perform public.request_booking('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005');
  raise exception 'SHOULD FAIL: a member who is not the host booked';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;

-- The host requests the slot.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
select public.request_booking('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005') is not null as requested;
do $$ begin
  assert (select booking_status from public.sessions where id = '20000000-0000-0000-0000-000000000005') = 'requested', 'session shows requested';
end $$;

-- The owner sees the booking (party size, no names) and its notification.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
do $$ begin
  assert (select party_size from public.venue_bookings) = 2, 'owner sees the party size';
  assert (select count(*) from public.notifications where kind = 'booking_request') = 1, 'owner is notified';
  assert (select count(*) from public.profiles where gender = 'f') = 0, 'owner still sees no women';
end $$;

-- Someone else cannot answer it; the owner confirms.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  perform public.respond_booking((select id from public.venue_bookings limit 1), true);
  raise exception 'SHOULD FAIL: non-owner confirmed';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
select public.respond_booking((select id from public.venue_bookings where status = 'pending' limit 1), true);

-- The session takes the slot's time and price; members are told.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$ begin
  assert (select booking_status from public.sessions where id = '20000000-0000-0000-0000-000000000005') = 'booked', 'session booked';
  assert (select total_price_sar from public.sessions where id = '20000000-0000-0000-0000-000000000005') = 200, 'price set from slot';
  assert (select booking_note from public.sessions where id = '20000000-0000-0000-0000-000000000005') like 'رمز الحجز: %', 'booking code noted';
  assert (select count(*) from public.notifications where kind = 'booked') = 1, 'members are told it is booked';
end $$;

-- f1 marks her share paid; she cannot move her membership row.
update public.session_members set paid_at = now()
where session_id = '20000000-0000-0000-0000-000000000005' and user_id = '00000000-0000-0000-0000-0000000000f1';
do $$ begin
  assert (select paid_at is not null from public.session_members
          where session_id = '20000000-0000-0000-0000-000000000005' and user_id = '00000000-0000-0000-0000-0000000000f1'), 'paid recorded';
  update public.session_members set session_id = '20000000-0000-0000-0000-000000000001'
  where session_id = '20000000-0000-0000-0000-000000000005' and user_id = '00000000-0000-0000-0000-0000000000f1';
  raise exception 'SHOULD FAIL: member moved her membership';
exception when others then if sqlerrm like 'SHOULD FAIL%' then raise; end if;
end $$;

-- The host cancels: the slot reopens and the owner hears about it.
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
do $$ begin
  assert (select count(*) from public.notifications where kind = 'booking_confirmed') = 1, 'host is told it was confirmed';
end $$;
select public.cancel_booking((select id from public.venue_bookings where status = 'confirmed' limit 1));
reset role;
do $$ begin
  assert (select status from public.venue_slots where id = '30000000-0000-0000-0000-000000000001') = 'open', 'slot reopens';
  assert (select booking_status from public.sessions where id = '20000000-0000-0000-0000-000000000005') = 'none', 'session unbooked';
  assert (select count(*) from public.notifications where kind = 'booking_cancelled') = 1, 'owner hears about the cancellation';
end $$;
