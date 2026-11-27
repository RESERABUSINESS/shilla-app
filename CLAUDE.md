# Shilla (شلة)

A mobile app that connects people who share a hobby (padel, running,
pottery, reading, coffee, hiking...). Users pick their hobbies, see nearby venues,
find people with the same interests, and join or create sessions. Studios and
academies can post paid workshops. Launch market: Riyadh, Saudi Arabia.

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
  sample mode. Sign-in is anonymous for now (TODO: phone OTP, then Nafath).
- Supabase project: `shilla` (ref `lgfbdiuhzksyogllvjlg`). Apply new migrations
  there after `npm run test:db` passes. `supabase/seed_sample_venues.sql` holds
  fictional test venues.

## Commands

```bash
npm install
npx expo start            # open in Expo Go on a phone
npm run typecheck         # tsc --noEmit
npm run lint              # eslint
npm run test:db           # database rule checks (needs local Postgres + PostGIS)
```

Install packages with `npx expo install <pkg>` so versions match the Expo SDK.

Before calling a change done: `npm run typecheck` and `npm run lint` pass, and if
the change touches `supabase/`, `npm run test:db` passes.

## Code layout

```
src/app/(onboarding)/   welcome, verify, hobbies (sign-up flow)
src/app/(tabs)/         sessions, places, people, profile
src/app/session/        new (create), [id] (details and chat)
src/components/         shared UI (ui.tsx), SessionCard, HobbyPicker, HobbyFilter
src/lib/                hobbies catalog, types, store (state), theme, format, supabase
supabase/migrations/    schema, RLS, triggers, RPC functions
supabase/seed.sql       hobby catalog
scripts/db-test/        runs the migration on local Postgres and checks the rules
```
