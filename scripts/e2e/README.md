# End-to-end tests (web build against the real Supabase project)

These drive the web build in headless Chromium with several users at once and
check the real backend: sign-up and sign-in, sessions and live chat, invites and
notifications, and that women and men never see each other.

```bash
npx expo export --platform web --output-dir /tmp/shilla-web
node scripts/e2e/serve.js /tmp/shilla-web &      # serves on :8097
node scripts/e2e/auth.js
node scripts/e2e/multi.js
node scripts/e2e/social.js
node scripts/e2e/location.js
node scripts/e2e/safety.js
node scripts/e2e/booking1.js   # then approve the claim (below)
node scripts/e2e/booking2.js
```

Between the two booking parts, approve the test owner's claim, and afterwards
restore the venue (it is a real place):

```sql
update public.venue_claims set status = 'approved'
where user_id in (select id from auth.users where email like 'qa-bk-o-%@mailinator.com');
-- after booking2.js, with the venue id it printed:
delete from public.venue_slots where venue_id = '<venue id>';
update public.venues set owner_id = null, verified = false, source = 'osm' where id = '<venue id>';
```

If `playwright` is installed globally rather than in the project, prefix each
command with `NODE_PATH=$(npm root -g)`.

They create real accounts with `qa-…@mailinator.com` emails. Delete them after
each run (some tests look for names that earlier runs also used):

```sql
delete from public.venues where source = 'user' and name = 'ملعب اختبار شلة';
delete from auth.users where email like 'qa-%@mailinator.com';
```
