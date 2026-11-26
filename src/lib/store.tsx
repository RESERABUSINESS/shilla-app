// App state. Runs on sample data for now; each action is the place where the
// matching Supabase call goes once the backend is connected (see docs/ROADMAP.md).
//
// Gender separation rule: every list this store exposes is already filtered
// to the viewer's gender. In production that filtering happens in Postgres
// row-level security, and this client-side filter is only a second layer.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { SAMPLE_PEOPLE, SAMPLE_SESSIONS, SAMPLE_VENUES } from '@/data/sample';

import { hobby } from './hobbies';
import { venueVisibleTo } from './format';
import type { HobbyLevels, Person, Profile, Session, Venue } from './types';

const PROFILE_KEY = 'shilla.profile.v1';

export type Match = { person: Person; shared: string[]; score: number };

type NewSession = { hobbyId: string; venueId: string; startsAtLabel: string; level: number };

type Store = {
  ready: boolean;
  profile: Profile | null;
  sessions: Session[];
  venues: Venue[];
  matches: Match[];
  saveProfile: (p: Profile) => void;
  setHobbies: (h: HobbyLevels) => void;
  togglePrivacy: (key: keyof Profile['privacy']) => void;
  toggleMembership: (sessionId: string) => void;
  createSession: (s: NewSession) => string;
  sendMessage: (sessionId: string, text: string) => void;
  signOut: () => void;
};

const Ctx = createContext<Store | null>(null);

/** Match score from shared hobbies, level closeness and distance (55–98). */
export function matchScore(me: HobbyLevels, other: Person): Match | null {
  const shared = Object.keys(other.hobbies).filter((h) => h in me);
  if (!shared.length) return null;
  const levelGap = shared.reduce((t, h) => t + Math.abs(other.hobbies[h] - me[h]), 0) / shared.length;
  const raw = 70 + shared.length * 9 - levelGap * 8 - other.distanceKm * 2;
  return { person: other, shared, score: Math.max(55, Math.min(98, Math.round(raw))) };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allSessions, setAllSessions] = useState<Session[]>(SAMPLE_SESSIONS);

  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY)
      .then((raw) => raw && setProfile(JSON.parse(raw) as Profile))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((p: Profile | null) => {
    setProfile(p);
    (p ? AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p)) : AsyncStorage.removeItem(PROFILE_KEY)).catch(() => {});
  }, []);

  const store = useMemo<Store>(() => {
    const g = profile?.gender;
    const updateSession = (id: string, fn: (s: Session) => Session) =>
      setAllSessions((list) => list.map((s) => (s.id === id ? fn(s) : s)));

    return {
      ready,
      profile,
      sessions: g ? allSessions.filter((s) => s.gender === g) : [],
      venues: g ? SAMPLE_VENUES.filter((v) => venueVisibleTo(v, g)).sort((a, b) => a.distanceKm - b.distanceKm) : [],
      matches:
        g && profile
          ? SAMPLE_PEOPLE.filter((p) => p.gender === g)
              .map((p) => matchScore(profile.hobbies, p))
              .filter((m): m is Match => m !== null)
              .sort((a, b) => b.score - a.score)
          : [],
      saveProfile: persist,
      setHobbies: (hobbies) => profile && persist({ ...profile, hobbies }),
      togglePrivacy: (key) =>
        profile && persist({ ...profile, privacy: { ...profile.privacy, [key]: !profile.privacy[key] } }),
      toggleMembership: (id) => {
        if (!profile) return;
        const me = profile.firstName;
        updateSession(id, (s) => {
          if (s.gender !== profile.gender || s.hostName === me) return s;
          if (s.members.includes(me)) return { ...s, members: s.members.filter((m) => m !== me) };
          if (s.capacity > 0 && s.members.length >= s.capacity) return s;
          return { ...s, members: [...s.members, me] };
        });
      },
      createSession: ({ hobbyId, venueId, startsAtLabel, level }) => {
        if (!profile) throw new Error('Not signed in');
        const id = `s${Date.now()}`;
        const session: Session = {
          id,
          kind: 'meetup',
          gender: profile.gender,
          hobbyId,
          venueId,
          startsAtLabel,
          level,
          hostName: profile.firstName,
          capacity: hobby(hobbyId).groupSize,
          members: [profile.firstName],
          messages: [{ id: `${id}-0`, author: profile.firstName, text: 'أنشأت الجلسة، حياكم!', sentAt: new Date().toISOString() }],
        };
        setAllSessions((list) => [session, ...list]);
        return id;
      },
      sendMessage: (id, text) =>
        profile &&
        updateSession(id, (s) => ({
          ...s,
          messages: [...s.messages, { id: `${id}-${s.messages.length}`, author: profile.firstName, text, sentAt: new Date().toISOString() }],
        })),
      signOut: () => persist(null),
    };
  }, [ready, profile, allSessions, persist]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useApp() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useApp must be used inside <AppProvider>');
  return s;
}

/** The signed-in profile. Only use inside screens that require a profile. */
export function useProfile(): Profile {
  const { profile } = useApp();
  if (!profile) throw new Error('No profile');
  return profile;
}
