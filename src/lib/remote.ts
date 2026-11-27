// Supabase data access. Every query here relies on row-level security for
// gender separation: the database only ever returns rows from the caller's side.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { CITIES, cityById, nearestCity } from './cities';
import { formatDuration, formatStartsAt } from './format';
import { hobby } from './hobbies';
import { supabase } from './supabase';
import type { AppNotification, BlockedPerson, BookingStatus, ChatMessage, Slot, VenueBooking, Gender, HobbyLevels, NotifyPrefs, Person, Profile, Session, Venue, VenueAudience } from './types';

const LOCATION_KEY = 'shilla.location.v1';
/** Central Riyadh: used only before the user has any saved location. */
export const DEFAULT_LOCATION = { lat: 24.7136, lng: 46.6753 };
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
  if (msg.includes('already a member')) return 'هالشخص منضم للجلسة من قبل.';
  if (msg.includes('slot is not available')) return 'هالوقت انحجز أو ما عاد متاح. اختر وقت ثاني.';
  if (msg.includes('session already has a booking')) return 'الجلسة عندها حجز من قبل.';
  if (msg.includes('only the host can book')) return 'منظم الجلسة بس يقدر يحجز.';
  if (msg.includes('booking already answered')) return 'تم الرد على هالطلب من قبل.';
  if (msg.includes('venue does not serve this gender')) return 'المكان ما يخدم هالفئة.';
  if (msg.includes('venue_claims') && msg.includes('duplicate')) return 'قدمت طلب لهالمكان من قبل.';
  if (msg.includes('only participants can invite')) return 'لازم تكون منضم للجلسة عشان تدعو أحد.';
  if (msg.includes('duplicate key') && msg.includes('invites')) return 'دعيته لهالجلسة من قبل.';
  if (msg.includes('invalid suggestion')) return 'اكتب اسم المكان واختر هواية وحدة على الأقل.';
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

/** A place on the map with the names people use for it. */
export type Place = { loc: LatLng; city: string; district: string };

/**
 * Reads the device location and names its city and district. Asks for
 * permission only when `ask` is true; returns null when location is unavailable.
 */
export async function devicePlace(ask: boolean): Promise<Place | null> {
  try {
    const perm = ask ? await Location.requestForegroundPermissionsAsync() : await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    let city = nearestCity(loc)?.name ?? '';
    let district = '';
    try {
      const [r] = await Location.reverseGeocodeAsync({ latitude: loc.lat, longitude: loc.lng });
      if (r) {
        city = r.city || city || r.region || '';
        district = r.district || r.subregion || '';
      }
    } catch {
      // Reverse geocoding is not available everywhere (for example on the web).
    }
    return { loc, city, district };
  } catch {
    return null;
  }
}

/** Device location if allowed, otherwise the last saved one. */
export async function resolveLocation(): Promise<LatLng> {
  return (await devicePlace(true))?.loc ?? (await savedLocation());
}

export async function savedLocation(): Promise<LatLng> {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_KEY);
    if (raw) return JSON.parse(raw) as LatLng;
  } catch {}
  return DEFAULT_LOCATION;
}

/** The location saved on the server (works on a fresh install), cached locally. */
export async function myLocation(): Promise<LatLng> {
  const { data, error } = await db().rpc('my_location');
  const row = !error && Array.isArray(data) ? (data[0] as LatLng | undefined) : undefined;
  if (row) {
    await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(row)).catch(() => {});
    return row;
  }
  return savedLocation();
}

/** Stores the user's location privately and their city and district on the profile. */
export async function savePlace(userId: string, place: Place) {
  await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(place.loc)).catch(() => {});
  const { error: lErr } = await db()
    .from('user_locations')
    .upsert({ user_id: userId, location: toPoint(place.loc), updated_at: new Date().toISOString() });
  if (lErr) throw lErr;
  const { error } = await db().from('profiles').update({ city: place.city, district: place.district || null }).eq('id', userId);
  if (error) throw error;
}

/** The place for a city picked by hand (its centre). */
export function cityPlace(cityId: string): Place {
  const c = cityById(cityId) ?? CITIES[0];
  return { loc: { lat: c.lat, lng: c.lng }, city: c.name, district: '' };
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
  notify_push: boolean;
  notify_messages: boolean;
  notify_reminders: boolean;
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
    notify: { push: r.notify_push, messages: r.notify_messages, reminders: r.notify_reminders },
  };
}

/** The signed-in user's profile, or null when signed out or not yet onboarded. */
export async function loadProfile(): Promise<Profile | null> {
  const { data: auth } = await db().auth.getSession();
  if (!auth.session) return null;
  const { data, error } = await db()
    .from('profiles')
    .select('id, first_name, gender, city, district, hide_photo, first_name_only, notify_push, notify_messages, notify_reminders, user_hobbies(hobby_id, level)')
    .eq('id', auth.session.user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? toProfile(data as ProfileRow) : null;
}

export type SignupInput = {
  firstName: string;
  gender: Gender;
  hobbies: HobbyLevels;
  email: string;
  password: string;
  /** Used when the device location is not shared. */
  cityId: string;
};

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

  const place = (await devicePlace(true)) ?? cityPlace(input.cityId);
  const { error: pErr } = await db().from('profiles').insert({
    id: userId,
    first_name: input.firstName,
    gender: input.gender,
    city: place.city || cityPlace(input.cityId).city,
    district: place.district || null,
    hide_photo: input.gender === 'f',
    first_name_only: input.gender === 'f',
  });
  if (pErr) throw pErr;

  await saveHobbies(userId, input.hobbies);

  await savePlace(userId, { ...place, city: place.city || cityPlace(input.cityId).city });

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

export async function saveName(userId: string, firstName: string) {
  const { error } = await db().from('profiles').update({ first_name: firstName.trim() }).eq('id', userId);
  if (error) throw error;
}

export async function saveNotifyPrefs(userId: string, p: NotifyPrefs) {
  const { error } = await db()
    .from('profiles')
    .update({ notify_push: p.push, notify_messages: p.messages, notify_reminders: p.reminders })
    .eq('id', userId);
  if (error) throw error;
}

export async function savePushToken(userId: string, token: string, platform: string) {
  const { error } = await db().from('push_tokens').upsert({ token, user_id: userId, platform, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Permanently deletes the account and everything that belongs to it. */
export async function deleteAccount() {
  const { error } = await db().rpc('delete_my_account');
  if (error) throw error;
  await db().auth.signOut();
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
  latitude: number;
  longitude: number;
  verified: boolean;
  source: Venue['source'];
  phone: string | null;
  website: string | null;
  is_partner: boolean;
  rating_count: number;
};

export async function loadVenues(): Promise<Venue[]> {
  const loc = await myLocation();
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
    latitude: v.latitude,
    longitude: v.longitude,
    verified: v.verified,
    source: v.source,
    phone: v.phone ?? undefined,
    website: v.website ?? undefined,
    isPartner: v.is_partner,
    ratingCount: v.rating_count,
  }));
}

export type SuggestInput = { name: string; kind: string; lat: number; lng: number; audience: VenueAudience; hobbies: string[] };

export async function suggestVenue(s: SuggestInput): Promise<string> {
  const { data, error } = await db().rpc('suggest_venue', {
    p_name: s.name,
    p_kind: s.kind,
    lat: s.lat,
    lng: s.lng,
    p_audience: s.audience,
    p_hobbies: s.hobbies,
  });
  if (error) throw error;
  return data as string;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

type SessionRow = {
  id: string;
  kind: 'meetup' | 'workshop';
  status: Session['status'];
  booking_status: BookingStatus;
  booking_note: string | null;
  total_price_sar: number | null;
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
  session_members: { user_id: string; paid_at: string | null; profile: { first_name: string } | null }[];
};

const SESSION_SELECT =
  'id, kind, status, booking_status, booking_note, total_price_sar, gender, hobby_id, venue_id, host_id, starts_at, duration_minutes, level, capacity, price_sar, ' +
  'venue:venues(name, audience), host:profiles!sessions_host_id_fkey(first_name), ' +
  'session_members(user_id, paid_at, profile:profiles(first_name))';

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
    startsAt: r.starts_at,
    status: r.status,
    level: r.level,
    hostId: r.host_id,
    hostName: r.host?.first_name ?? '',
    capacity: r.capacity,
    members: r.session_members.map((m) => ({ id: m.user_id, name: m.profile?.first_name ?? '', paid: m.paid_at !== null })),
    bookingStatus: r.booking_status,
    bookingNote: r.booking_note ?? undefined,
    totalPriceSar: r.total_price_sar != null ? Number(r.total_price_sar) : undefined,
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

/** Host only. Members get a notification from the database. */
export async function cancelSession(sessionId: string) {
  const { error } = await db().from('sessions').update({ status: 'cancelled' }).eq('id', sessionId);
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

// ---------------------------------------------------------------------------
// Invites and notifications
// ---------------------------------------------------------------------------

export async function sendInvite(sessionId: string, fromId: string, toId: string) {
  const { error } = await db().from('invites').insert({ session_id: sessionId, from_id: fromId, to_id: toId });
  if (error) throw error;
}

export async function declineInvite(inviteId: string) {
  const { error } = await db().from('invites').update({ status: 'declined' }).eq('id', inviteId);
  if (error) throw error;
}

type NotificationRow = {
  id: number;
  kind: AppNotification['kind'];
  session_id: string | null;
  invite_id: string | null;
  actor_name: string | null;
  hobby_id: string | null;
  read_at: string | null;
  created_at: string;
  invite: { status: AppNotification['inviteStatus'] } | null;
};

export async function loadNotifications(): Promise<AppNotification[]> {
  const { data, error } = await db()
    .from('notifications')
    .select('id, kind, session_id, invite_id, actor_name, hobby_id, read_at, created_at, invite:invites(status)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as unknown as NotificationRow[]).map((n) => ({
    id: String(n.id),
    kind: n.kind,
    sessionId: n.session_id ?? undefined,
    inviteId: n.invite_id ?? undefined,
    inviteStatus: n.invite?.status ?? undefined,
    actorName: n.actor_name ?? undefined,
    hobbyId: n.hobby_id ?? undefined,
    read: n.read_at !== null,
    createdAt: n.created_at,
  }));
}

export async function markNotificationsRead() {
  const { error } = await db().from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (error) throw error;
}

/** Calls `onNew` when a notification arrives for the signed-in user. */
export function subscribeNotifications(userId: string, onNew: () => void) {
  const channel = db()
    .channel(`notifications:${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, onNew)
    .subscribe();
  return () => {
    db().removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// My sessions, ratings, safety
// ---------------------------------------------------------------------------

/** Sessions the user hosts or joined, newest first, including past and cancelled ones. */
export async function loadMySessions(userId: string): Promise<Session[]> {
  const { data, error } = await db()
    .from('sessions')
    .select(`${SESSION_SELECT}, mine:session_members!inner(user_id)`)
    .eq('mine.user_id', userId)
    .order('starts_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as unknown as SessionRow[]).map(toSession);
}

export async function loadRatedSessionIds(): Promise<string[]> {
  const { data, error } = await db().from('session_ratings').select('session_id');
  if (error) throw error;
  return (data ?? []).map((r) => r.session_id as string);
}

export async function rateSession(userId: string, sessionId: string, stars: number) {
  const { error } = await db().from('session_ratings').insert({ session_id: sessionId, user_id: userId, stars });
  if (error) throw error;
}

export async function blockUser(userId: string, blockedId: string) {
  const { error } = await db().from('blocks').insert({ blocker_id: userId, blocked_id: blockedId });
  if (error && !error.message.includes('duplicate key')) throw error;
}

export async function unblockUser(userId: string, blockedId: string) {
  const { error } = await db().from('blocks').delete().eq('blocker_id', userId).eq('blocked_id', blockedId);
  if (error) throw error;
}

export async function loadBlocks(): Promise<BlockedPerson[]> {
  const { data, error } = await db().rpc('my_blocks');
  if (error) throw error;
  return (data as { user_id: string; first_name: string }[]).map((b) => ({ id: b.user_id, firstName: b.first_name }));
}

export async function reportUser(reporterId: string, reportedId: string, reason: string, sessionId?: string) {
  const { error } = await db()
    .from('reports')
    .insert({ reporter_id: reporterId, reported_user_id: reportedId, reason, session_id: sessionId ?? null });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Bookings: organising (phase 1) and partner venues (phase 2)
// ---------------------------------------------------------------------------

/** Host only: booking status, total price and a note for the session. */
export async function saveBookingDetails(sessionId: string, d: { status: 'none' | 'booked'; totalPriceSar: number | null; note: string }) {
  const { error } = await db()
    .from('sessions')
    .update({ booking_status: d.status, total_price_sar: d.totalPriceSar, booking_note: d.note.trim() || null })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function setPaid(sessionId: string, userId: string, paid: boolean) {
  const { error } = await db()
    .from('session_members')
    .update({ paid_at: paid ? new Date().toISOString() : null })
    .eq('session_id', sessionId)
    .eq('user_id', userId);
  if (error) throw error;
}

type SlotRow = {
  id: string;
  venue_id: string;
  hobby_id: string;
  audience: Gender;
  starts_at: string;
  duration_minutes: number;
  price_sar: number;
  status: Slot['status'];
};

const toSlot = (r: SlotRow): Slot => ({
  id: r.id,
  venueId: r.venue_id,
  hobbyId: r.hobby_id,
  audience: r.audience,
  startsAt: r.starts_at,
  durationMinutes: r.duration_minutes,
  priceSar: Number(r.price_sar),
  status: r.status,
});

const SLOT_COLUMNS = 'id, venue_id, hobby_id, audience, starts_at, duration_minutes, price_sar, status';

/** Open future slots at a venue that the caller can book (RLS limits them to the caller's side). */
export async function loadOpenSlots(venueId: string, hobbyId?: string): Promise<Slot[]> {
  let q = db().from('venue_slots').select(SLOT_COLUMNS).eq('venue_id', venueId).eq('status', 'open').gt('starts_at', new Date().toISOString());
  if (hobbyId) q = q.eq('hobby_id', hobbyId);
  const { data, error } = await q.order('starts_at').limit(60);
  if (error) throw error;
  return (data as SlotRow[]).map(toSlot);
}

export async function requestBooking(slotId: string, sessionId: string): Promise<string> {
  const { data, error } = await db().rpc('request_booking', { p_slot: slotId, p_session: sessionId });
  if (error) throw error;
  return data as string;
}

/** The host's active booking request for a session, if any. */
export async function loadActiveBooking(sessionId: string): Promise<VenueBooking | null> {
  const { data, error } = await db()
    .from('venue_bookings')
    .select(`id, slot_id, venue_id, session_id, party_size, code, status, slot:venue_slots(${SLOT_COLUMNS})`)
    .eq('session_id', sessionId)
    .in('status', ['pending', 'confirmed'])
    .maybeSingle();
  if (error) throw error;
  return data ? toBooking(data as unknown as BookingRow) : null;
}

export async function cancelBooking(bookingId: string) {
  const { error } = await db().rpc('cancel_booking', { p_booking: bookingId });
  if (error) throw error;
}

export async function claimVenue(userId: string, venueId: string, businessName: string, contact: string) {
  const { error } = await db()
    .from('venue_claims')
    .insert({ venue_id: venueId, user_id: userId, business_name: businessName.trim(), contact: contact.trim() });
  if (error) throw error;
}

export async function loadMyClaims(): Promise<{ venueId: string; status: string }[]> {
  const { data, error } = await db().from('venue_claims').select('venue_id, status');
  if (error) throw error;
  return (data ?? []).map((c) => ({ venueId: c.venue_id as string, status: c.status as string }));
}

export type OwnedVenue = { id: string; name: string; kind: string; audience: VenueAudience; hobbies: string[] };

export async function loadOwnedVenues(userId: string): Promise<OwnedVenue[]> {
  const { data, error } = await db()
    .from('venues')
    .select('id, name, kind, audience, venue_hobbies(hobby_id)')
    .eq('owner_id', userId)
    .order('name');
  if (error) throw error;
  return (data as { id: string; name: string; kind: string; audience: VenueAudience; venue_hobbies: { hobby_id: string }[] }[]).map((v) => ({
    id: v.id,
    name: v.name,
    kind: v.kind,
    audience: v.audience,
    hobbies: v.venue_hobbies.map((h) => h.hobby_id),
  }));
}

/** Owner: every slot from today on. */
export async function loadOwnerSlots(venueId: string): Promise<Slot[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data, error } = await db()
    .from('venue_slots')
    .select(SLOT_COLUMNS)
    .eq('venue_id', venueId)
    .gte('starts_at', today.toISOString())
    .order('starts_at')
    .limit(200);
  if (error) throw error;
  return (data as SlotRow[]).map(toSlot);
}

export type NewSlot = { venueId: string; hobbyId: string; audience: Gender; startsAt: Date; durationMinutes: number; priceSar: number };

export async function addSlot(s: NewSlot) {
  const { error } = await db().from('venue_slots').insert({
    venue_id: s.venueId,
    hobby_id: s.hobbyId,
    audience: s.audience,
    starts_at: s.startsAt.toISOString(),
    duration_minutes: s.durationMinutes,
    price_sar: s.priceSar,
  });
  if (error) throw error;
}

export async function deleteSlot(slotId: string) {
  const { error } = await db().from('venue_slots').delete().eq('id', slotId);
  if (error) throw error;
}

type BookingRow = {
  id: string;
  slot_id: string;
  venue_id: string;
  session_id: string;
  party_size: number;
  code: string;
  status: VenueBooking['status'];
  slot: SlotRow | null;
};

const toBooking = (b: BookingRow): VenueBooking => ({
  id: b.id,
  slotId: b.slot_id,
  venueId: b.venue_id,
  sessionId: b.session_id,
  partySize: b.party_size,
  code: b.code,
  status: b.status,
  slot: b.slot ? toSlot(b.slot) : undefined,
});

/** Owner: bookings for a venue, newest first. */
export async function loadOwnerBookings(venueId: string): Promise<VenueBooking[]> {
  const { data, error } = await db()
    .from('venue_bookings')
    .select(`id, slot_id, venue_id, session_id, party_size, code, status, slot:venue_slots(${SLOT_COLUMNS})`)
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data as unknown as BookingRow[]).map(toBooking);
}

export async function respondBooking(bookingId: string, accept: boolean) {
  const { error } = await db().rpc('respond_booking', { p_booking: bookingId, p_accept: accept });
  if (error) throw error;
}
