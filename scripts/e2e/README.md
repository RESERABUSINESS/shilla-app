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
```

They create real accounts with `qa-…@mailinator.com` emails. Delete them after
each run (some tests look for names that earlier runs also used):

```sql
delete from public.venues where source = 'user' and name = 'ملعب اختبار شلة';
delete from auth.users where email like 'qa-%@mailinator.com';
```
