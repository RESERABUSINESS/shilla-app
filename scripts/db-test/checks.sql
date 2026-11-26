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
