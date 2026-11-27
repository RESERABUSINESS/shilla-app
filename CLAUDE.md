# Shilla (شلة)

A mobile app that connects people who share a hobby (padel, running,
pottery, reading, coffee, hiking...). Users pick their hobbies, see nearby venues,
find people with the same interests, and join or create sessions. Studios and
academies can post paid workshops. Market: Saudi Arabia (Riyadh, Jeddah, Makkah,
Madinah, Dammam, Khobar; see `src/lib/cities.ts`). Never hard-code a city:
use the profile's city or the user's location.

- Product spec: [docs/PRD.md](docs/PRD.md)
- Phases and what is next: [docs/ROADMAP.md](docs/ROADMAP.md)
- Clickable HTML prototype the app is based on: [docs/prototype.html](docs/prototype.html)
- Expo-specific guidance (commands, routing, EAS): [AGENTS.md](AGENTS.md)

## Non-negotiable rules

1. **Women and men never see each other.** Profiles, people matches, sessions,
   members and chats are each locked to one gender. This is enforced in Postgres
   (row-level security plus triggers in `supabase/migrations`). Client-side
   filtering in `src/lib/store.tsx` is only a second layer and must never be the
   only check. Any new table that holds user content needs an RLS policy that
   keeps it within one gender, and a check in `scripts/db-test/checks.sql`.
2. **Gender comes from verification and is immutable.** The database trigger
   `profiles_gender_immutable` rejects changes. Never add UI to edit it.
3. **Exact user locations are private.** They live in `user_locations`, which only
   the owner can read. Distances to other people come from the
   `people_matches` function, rounded to whole kilometres.
4. **Hobbies are data, not code.** A new hobby is a row in `supabase/seed.sql`
   (and, until the app loads the catalog from the database, an entry in
   `src/lib/hobbies.ts`; keep both in sync). Never add hobby-specific screens or
   `if (hobby === ...)` branches; use the hobby's fields (`groupSize`, `teams`,
   `levels`, `category`).
5. **Arabic first, right-to-left.** All user-facing text is Saudi-friendly Arabic.
   Numbers use Arabic-Indic digits via `num()` in `src/lib/format.ts`. Use
   `start`/`end` style properties, not `left`/`right`.

## Stack

- Expo SDK (see `package.json`) with Expo Router, TypeScript strict. Routes live in
  `src/app/`; everything else in `src/components`, `src/lib`, `src/data`.
- Supabase: Postgres + PostGIS, Auth (phone OTP first, Nafath later), Realtime for
  chat, Storage for photos. Client in `src/lib/supabase.ts`, configured by
  `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`).
- `.env` holds the Supabase URL and publishable key (public by design; RLS protects
  the data). Without them the app runs on sample data from `src/data/sample.ts`.
- Data access lives in `src/lib/remote.ts`; `src/lib/store.tsx` picks Supabase or
  sample mode. Accounts use email + password (TODO: phone OTP, then Nafath);
  a few early accounts are anonymous and get a prompt to create an email account.
- Supabase project: `shilla` (ref `lgfbdiuhzksyogllvjlg`). Apply new migrations
  there after `npm run test:db` passes. Venues are real (OpenStreetMap import,
  `source = 'osm'`, unverified) plus user suggestions (`source = 'user'`).
  OSM does not know who a venue serves; keep showing the "confirm times" note.
- Notifications: triggers write `notifications` rows and send Expo pushes via
  `pg_net`; the app also schedules a local reminder an hour before a session.
- Use `confirmAction` / `notice` from `src/lib/confirm.ts`, never `Alert.alert`
  directly: Alert does nothing on the web.

## Thmanyah font (do not forget before a store build)

The app is designed for the Thmanyah Sans font (خط ثمانية). Its license allows
embedding in a packaged app but forbids uploading or hosting the font files, so:

- Never commit the font files, never put them in the web build, and never let
  them ship inside an Expo Update. `assets/fonts/thmanyah/` is gitignored.
- `app.config.js` embeds them only when `SHILLA_EMBED_FONTS=1` and the files are
  in `assets/fonts/thmanyah/` (`thmanyahsans-{Light,Regular,Medium,Bold,Black}.otf`).
  `src/lib/fonts.ts` switches the UI to the font only in such builds.
- **Before the first App Store / Google Play build, remind the user** to provide
  the font zip (from thmanyah.com), then follow the launch checklist in
  `docs/ROADMAP.md`. Tracked in GitHub issue RESERABUSINESS/shilla-app#1.

## Commands

```bash
npm install
npx expo start            # open in Expo Go on a phone
npm run typecheck         # tsc --noEmit
npm run lint              # eslint
npm run test:db           # database rule checks (needs local Postgres + PostGIS)
```

End-to-end tests against the real backend: see `scripts/e2e/README.md`.

Install packages with `npx expo install <pkg>` so versions match the Expo SDK.

Before calling a change done: `npm run typecheck` and `npm run lint` pass, and if
the change touches `supabase/`, `npm run test:db` passes.

## Code layout

```
src/app/(onboarding)/   welcome, verify, hobbies (sign-up flow)
src/app/(tabs)/         sessions, places (map + list), people, profile
src/app/session/        new, [id] (details), chat/[id], invite/[id]
src/app/                notifications, settings, suggest-venue, invite-person/[id], edit-hobbies
src/components/         shared UI (ui.tsx), SessionCard, HobbyPicker, HobbyFilter, VenueMap (+ .web), Icon
src/lib/                hobbies catalog, types, store (state), remote (Supabase), notifications,
                        confirm (dialogs that also work on web), theme, format, fonts
supabase/migrations/    schema, RLS, triggers, RPC functions
supabase/seed.sql       hobby catalog
supabase/import_osm_venues.sql  re-runnable import of real venues (6 cities) from OpenStreetMap
scripts/db-test/        runs the migration on local Postgres and checks the rules
```
