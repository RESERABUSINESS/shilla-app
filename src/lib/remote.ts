// Supabase data access. Every query here relies on row-level security for
// gender separation: the database only ever returns rows from the caller's side.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { formatDuration, formatStartsAt } from './format';
import { hobby } from './hobbies';
import { supabase } from './supabase';
import type { ChatMessage, Gender, HobbyLevels, Person, Profile, Session, Venue, VenueAudience } from './types';

const LOCATION_KEY = 'shilla.location.v1';
/** Al Malqa, Riyadh: used when the user does not share their location. */
export const DEFAULT_LOCATION = { lat: 24.807, lng: 46.615 };
const NEARBY_RADIUS_KM = 60;

export type LatLng = { lat: number; lng: number };

function db() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

/** Friendly Arabic message for errors raised by our database rules. */
export function errorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
  if (msg.includes('session is full')) return 'الجلسة اكتملت.';
  if (msg.includes('session is not open')) return 'الجلسة ما عادت متاحة.';
  if (msg.includes('blocked')) return 'ما تقدر تنضم لهالجلسة.';
  if (msg.includes('Anonymous sign-ins are disabled')) return 'التسجيل مقفل حاليًا في الخادم.';
  if (msg.includes('User already registered') || msg.includes('already been registered')) return 'هالإيميل مسجل من قبل. سجّل دخول بدل ما تنشئ حساب.';
  if (msg.includes('Invalid login credentials')) return 'الإيميل أو كلمة المرور غلط.';
  if (msg.includes('Email not confirmed')) return 'أكّد إيميلك من الرسالة اللي وصلتك، وبعدها سجّل دخول.';
  if (msg.includes('CONFIRM_EMAIL')) return 'أرسلنا لك رسالة على الإيميل. اضغط الرابط اللي فيها، وبعدها سجّل دخول.';
  if (msg.toLowerCase().includes('password') && msg.includes('6')) return 'كلمة المرور لازم تكون ٦ أحرف أو أكثر.';
  if (msg.toLowerCase().includes('invalid') && msg.toLowerCase().includes('email')) return 'الإيميل مو صحيح.';
  if (msg.toLowerCase().includes('rate limit')) return 'محاولات كثير. انتظر شوي وحاول مرة ثانية.';
  if (msg.toLowerCase().includes('network')) return 'تأكد من اتصالك بالإنترنت وحاول مرة ثانية.';
  return 'صار خطأ، حاول مرة ثانية.';
}

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

/** Asks for the device location once; falls back to the default district. */
export async function resolveLocation(): Promise<LatLng> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    }
  } catch {
    // Permission dialogs can fail on web or simulators; use the default.
  }
  return DEFAULT_LOCATION;
}

export async function savedLocation(): Promise<LatLng> {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_KEY);
    if (raw) return JSON.parse(raw) as LatLng;
  } catch {}
  return DEFAULT_LOCATION;
}

const toPoint = ({ lat, lng }: LatLng) => `SRID=4326;POINT(${lng} ${lat})`;

// ---------------------------------------------------------------------------
// Auth and profile
// ---------------------------------------------------------------------------

type ProfileRow = {
  id: string;
  first_name: string;
  gender: Gender;
  city: string;
  district: string | null;
  hide_photo: boolean;
  first_name_only: boolean;
  user_hobbies: { hobby_id: string; level: number }[];
};

const levelsOf = (rows: { hobby_id: string; level: number }[]): HobbyLevels =>
  Object.fromEntries(rows.map((r) => [r.hobby_id, r.level]));

function toProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    firstName: r.first_name,
    gender: r.gender,
    city: r.city,
    district: r.district ?? '',
    hobbies: levelsOf(r.user_hobbies),
    privacy: { hidePhoto: r.hide_photo, firstNameOnly: r.first_name_only },
  };
}

/** The signed-in user's profile, or null when signed out or not yet onboarded. */
export async function loadProfile(): Promise<Profile | null> {
  const { data: auth } = await db().auth.getSession();
  if (!auth.session) return null;
  const { data, error } = await db()
    .from('profiles')
    .select('id, first_name, gender, city, district, hide_photo, first_name_only, user_hobbies(hobby_id, level)')
    .eq('id', auth.session.user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? toProfile(data as ProfileRow) : null;
}

export type SignupInput = { firstName: string; gender: Gender; hobbies: HobbyLevels; email: string; password: string };

/** True when the signed-in account has no email yet (created before accounts existed). */
export async function isAnonymousAccount(): Promise<boolean> {
  const { data } = await db().auth.getSession();
  return Boolean(data.session?.user.is_anonymous);
}

// Email + password accounts. TODO(auth): add phone OTP once an SMS provider is
// configured in Supabase, and Nafath later. Gender must then come from
// verification instead of the sign-up form.
export async function signUp(input: SignupInput): Promise<Profile> {
  const { data: existing } = await db().auth.getSession();
  let userId = existing.session?.user.id;
  if (!userId) {
    const { data, error } = await db().auth.signUp({ email: input.email.trim(), password: input.password });
    if (error) throw error;
    // With "Confirm email" on, Supabase returns no session until the link is clicked.
    if (!data.session) throw new Error('CONFIRM_EMAIL');
    userId = data.user!.id;
  }

  const { error: pErr } = await db().from('profiles').insert({
    id: userId,
    first_name: input.firstName,
    gender: input.gender,
    district: 'الملقا',
    hide_photo: input.gender === 'f',
    first_name_only: input.gender === 'f',
  });
  if (pErr) throw pErr;

  await saveHobbies(userId, input.hobbies);

  const loc = await resolveLocation();
  await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(loc)).catch(() => {});
  const { error: lErr } = await db().from('user_locations').upsert({ user_id: userId, location: toPoint(loc), updated_at: new Date().toISOString() });
  if (lErr) throw lErr;

  const profile = await loadProfile();
  if (!profile) throw new Error('Profile was not created');
  return profile;
}

export async function saveHobbies(userId: string, hobbies: HobbyLevels) {
  const ids = Object.keys(hobbies);
  const { error: delErr } = await db()
    .from('user_hobbies')
    .delete()
    .eq('user_id', userId)
    .not('hobby_id', 'in', `(${ids.map((i) => `"${i}"`).join(',')})`);
  if (delErr) throw delErr;
  const { error } = await db()
    .from('user_hobbies')
    .upsert(ids.map((hobby_id) => ({ user_id: userId, hobby_id, level: hobbies[hobby_id] })));
  if (error) throw error;
}

export async function savePrivacy(userId: string, privacy: Profile['privacy']) {
  const { error } = await db()
    .from('profiles')
    .update({ hide_photo: privacy.hidePhoto, first_name_only: privacy.firstNameOnly })
    .eq('id', userId);
  if (error) throw error;
}

/** Signs in and returns the profile, or null when the account never finished onboarding. */
export async function signIn(email: string, password: string): Promise<Profile | null> {
  const { error } = await db().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return loadProfile();
}

export async function signOut() {
  await db().auth.signOut();
}

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

type VenueRow = {
  id: string;
  name: string;
  kind: string;
  district: string | null;
  audience: VenueAudience;
  men_hours: string | null;
  women_hours: string | null;
  price_label: string | null;
  rating: number | null;
  hobbies: string[];
  distance_km: number;
};

export async function loadVenues(): Promise<Venue[]> {
  const loc = await savedLocation();
  const { data, error } = await db().rpc('nearby_venues', { lat: loc.lat, lng: loc.lng, radius_km: NEARBY_RADIUS_KM });
  if (error) throw error;
  return (data as VenueRow[]).map((v) => ({
    id: v.id,
    name: v.name,
    kind: v.kind,
    district: v.district ?? '',
    hobbies: v.hobbies,
    audience: v.audience,
    menHours: v.men_hours ?? undefined,
    womenHours: v.women_hours ?? undefined,
    priceLabel: v.price_label ?? '',
    rating: Number(v.rating ?? 0),
    distanceKm: v.distance_km,
  }));
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

type SessionRow = {
  id: string;
  kind: 'meetup' | 'workshop';
  gender: Gender;
  hobby_id: string;
  venue_id: string;
  host_id: string;
  starts_at: string;
  duration_minutes: number | null;
  level: number;
  capacity: number;
  price_sar: number | null;
  venue: { name: string; audience: VenueAudience } | null;
  host: { first_name: string } | null;
  session_members: { user_id: string; profile: { first_name: string } | null }[];
};

const SESSION_SELECT =
  'id, kind, gender, hobby_id, venue_id, host_id, starts_at, duration_minutes, level, capacity, price_sar, ' +
  'venue:venues(name, audience), host:profiles!sessions_host_id_fkey(first_name), ' +
  'session_members(user_id, profile:profiles(first_name))';

function toSession(r: SessionRow): Session {
  const womenSlot = r.venue?.audience === 'both' && r.gender === 'f' ? ' · فترة نسائية' : '';
  return {
    id: r.id,
    kind: r.kind,
    gender: r.gender,
    hobbyId: r.hobby_id,
    venueId: r.venue_id,
    venueName: r.venue?.name,
    startsAtLabel: formatStartsAt(new Date(r.starts_at)) + womenSlot,
    level: r.level,
    hostId: r.host_id,
    hostName: r.host?.first_name ?? '',
    capacity: r.capacity,
    members: r.session_members.map((m) => ({ id: m.user_id, name: m.profile?.first_name ?? '' })),
    priceSar: r.price_sar ?? undefined,
    durationLabel: r.duration_minutes ? formatDuration(r.duration_minutes) : undefined,
    messages: [],
  };
}

/** Open sessions from three hours ago onwards, soonest first. */
export async function loadSessions(): Promise<Session[]> {
  const since = new Date(Date.now() - 3 * 3600_000).toISOString();
  const { data, error } = await db()
    .from('sessions')
    .select(SESSION_SELECT)
    .eq('status', 'open')
    .gte('starts_at', since)
    .order('starts_at');
  if (error) throw error;
  return (data as unknown as SessionRow[]).map(toSession);
}

export async function joinSession(sessionId: string, userId: string) {
  const { error } = await db().from('session_members').insert({ session_id: sessionId, user_id: userId });
  if (error) throw error;
}

export async function leaveSession(sessionId: string, userId: string) {
  const { error } = await db().from('session_members').delete().eq('session_id', sessionId).eq('user_id', userId);
  if (error) throw error;
}

export type NewSessionInput = { hobbyId: string; venueId: string; startsAt: Date; level: number };

export async function createSession(profile: Profile, input: NewSessionInput): Promise<string> {
  const { data, error } = await db()
    .from('sessions')
    .insert({
      kind: 'meetup',
      gender: profile.gender,
      hobby_id: input.hobbyId,
      venue_id: input.venueId,
      host_id: profile.id,
      starts_at: input.startsAt.toISOString(),
      level: input.level,
      capacity: hobby(input.hobbyId).groupSize,
    })
    .select('id')
    .single();
  if (error) throw error;
  // The host counts as a member, so capacity and the member list include them.
  await joinSession(data.id, profile.id);
  return data.id as string;
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

type MessageRow = { id: number; author_id: string; body: string; created_at: string; author: { first_name: string } | null };

const toMessage = (r: MessageRow, names: Record<string, string>): ChatMessage => ({
  id: String(r.id),
  authorId: r.author_id,
  author: r.author?.first_name ?? names[r.author_id] ?? '',
  text: r.body,
  sentAt: r.created_at,
});

export async function loadMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await db()
    .from('messages')
    .select('id, author_id, body, created_at, author:profiles(first_name)')
    .eq('session_id', sessionId)
    .order('created_at');
  if (error) throw error;
  return (data as unknown as MessageRow[]).map((r) => toMessage(r, {}));
}

export async function sendMessage(sessionId: string, authorId: string, text: string) {
  const { error } = await db().from('messages').insert({ session_id: sessionId, author_id: authorId, body: text });
  if (error) throw error;
}

/** Calls `onMessage` for each new message in the session. Returns an unsubscribe function. */
export function subscribeMessages(sessionId: string, names: Record<string, string>, onMessage: (m: ChatMessage) => void) {
  const channel = db()
    .channel(`messages:${sessionId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `session_id=eq.${sessionId}` }, (payload) =>
      onMessage(toMessage({ ...(payload.new as Omit<MessageRow, 'author'>), author: null }, names)),
    )
    .subscribe();
  return () => {
    db().removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

type MatchRow = { user_id: string; first_name: string; shared_hobbies: string[]; distance_km: number; score: number };

export async function loadMatches(gender: Gender): Promise<{ person: Person; shared: string[]; score: number }[]> {
  const { data, error } = await db().rpc('people_matches', { radius_km: NEARBY_RADIUS_KM, max_rows: 50 });
  if (error) throw error;
  const rows = data as MatchRow[];
  if (!rows.length) return [];
  const { data: levels, error: lErr } = await db()
    .from('user_hobbies')
    .select('user_id, hobby_id, level')
    .in('user_id', rows.map((r) => r.user_id));
  if (lErr) throw lErr;
  return rows.map((r) => ({
    person: {
      id: r.user_id,
      firstName: r.first_name,
      gender,
      hobbies: levelsOf((levels ?? []).filter((l) => l.user_id === r.user_id)),
      distanceKm: r.distance_km,
      availability: '',
    },
    shared: r.shared_hobbies,
    score: r.score,
  }));
}
