// App state. With Supabase configured (EXPO_PUBLIC_SUPABASE_* in .env) every
// action goes to the database through src/lib/remote.ts. Without it the app
// runs on the sample data in src/data/sample.ts, which keeps demos and the web
// preview working offline.
//
// Gender separation rule: in Supabase mode the database's row-level security
// decides what each user sees. The client-side filters below are only a second
// layer and apply to sample mode.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { SAMPLE_PEOPLE, SAMPLE_SESSIONS, SAMPLE_VENUES } from '@/data/sample';

import { formatStartsAt, venueVisibleTo } from './format';
import { hobby } from './hobbies';
import * as remote from './remote';
import { isSupabaseConfigured } from './supabase';
import type { ChatMessage, HobbyLevels, Person, Profile, Session, Venue } from './types';

const PROFILE_KEY = 'shilla.profile.v1';

export type Match = { person: Person; shared: string[]; score: number };
export type NewSession = { hobbyId: string; venueId: string; startsAt: Date; level: number };

type Store = {
  ready: boolean;
  online: boolean;
  profile: Profile | null;
  sessions: Session[];
  venues: Venue[];
  matches: Match[];
  refreshing: boolean;
  refresh: () => Promise<void>;
  /** True when the account has no email yet and would be lost on sign-out. */
  anonymous: boolean;
  signUp: (input: remote.SignupInput) => Promise<void>;
  /** Returns false when the account exists but never finished sign-up. */
  signIn: (email: string, password: string) => Promise<boolean>;
  saveAccount: (email: string, password: string) => Promise<void>;
  setHobbies: (h: HobbyLevels) => Promise<void>;
  togglePrivacy: (key: keyof Profile['privacy']) => Promise<void>;
  toggleMembership: (sessionId: string) => Promise<void>;
  createSession: (s: NewSession) => Promise<string>;
  signOut: () => Promise<void>;
  /** Sample mode only: append a chat message locally. */
  addSampleMessage: (sessionId: string, text: string) => void;
};

const Ctx = createContext<Store | null>(null);

/** Match score from shared hobbies, level closeness and distance (55–98). Mirrors people_matches(). */
export function matchScore(me: HobbyLevels, other: Person): Match | null {
  const shared = Object.keys(other.hobbies).filter((h) => h in me);
  if (!shared.length) return null;
  const levelGap = shared.reduce((t, h) => t + Math.abs(other.hobbies[h] - me[h]), 0) / shared.length;
  const raw = 70 + shared.length * 9 - levelGap * 8 - other.distanceKm * 2;
  return { person: other, shared, score: Math.max(55, Math.min(98, Math.round(raw))) };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const online = isSupabaseConfigured;
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [remoteSessions, setRemoteSessions] = useState<Session[]>([]);
  const [remoteVenues, setRemoteVenues] = useState<Venue[]>([]);
  const [remoteMatches, setRemoteMatches] = useState<Match[]>([]);
  const [sampleSessions, setSampleSessions] = useState<Session[]>(SAMPLE_SESSIONS);
  const signedInGender = profile?.gender;

  const load = useCallback(async () => {
    if (!online || !signedInGender) return;
    const [s, v, m] = await Promise.all([remote.loadSessions(), remote.loadVenues(), remote.loadMatches(signedInGender)]);
    setRemoteSessions(s);
    setRemoteVenues(v);
    setRemoteMatches(m);
  }, [online, signedInGender]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // Restore the signed-in profile on launch.
  useEffect(() => {
    const restore = online
      ? remote.loadProfile()
      : AsyncStorage.getItem(PROFILE_KEY).then((raw) => (raw ? (JSON.parse(raw) as Profile) : null));
    restore
      .then(async (p) => {
        setProfile(p);
        if (online && p) setAnonymous(await remote.isAnonymousAccount());
      })
      .catch(() => setProfile(null))
      .finally(() => setReady(true));
  }, [online]);

  // Load data whenever someone signs in.
  const signedInId = profile?.id;
  useEffect(() => {
    if (!online || !signedInId || !signedInGender) return;
    let alive = true;
    Promise.all([remote.loadSessions(), remote.loadVenues(), remote.loadMatches(signedInGender)])
      .then(([s, v, m]) => {
        if (!alive) return;
        setRemoteSessions(s);
        setRemoteVenues(v);
        setRemoteMatches(m);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [online, signedInId, signedInGender]);

  const persistLocal = useCallback((p: Profile | null) => {
    setProfile(p);
    (p ? AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p)) : AsyncStorage.removeItem(PROFILE_KEY)).catch(() => {});
  }, []);

  const store = useMemo<Store>(() => {
    const g = profile?.gender;

    const sample = {
      sessions: g ? sampleSessions.filter((s) => s.gender === g) : [],
      venues: g ? SAMPLE_VENUES.filter((v) => venueVisibleTo(v, g)).sort((a, b) => a.distanceKm - b.distanceKm) : [],
      matches:
        g && profile
          ? SAMPLE_PEOPLE.filter((p) => p.gender === g)
              .map((p) => matchScore(profile.hobbies, p))
              .filter((m): m is Match => m !== null)
              .sort((a, b) => b.score - a.score)
          : [],
    };
    const updateSample = (id: string, fn: (s: Session) => Session) =>
      setSampleSessions((list) => list.map((s) => (s.id === id ? fn(s) : s)));

    return {
      ready,
      online,
      profile,
      sessions: online ? remoteSessions : sample.sessions,
      venues: online ? remoteVenues : sample.venues,
      matches: online ? remoteMatches : sample.matches,
      refreshing,
      refresh,
      anonymous,

      signUp: async (input) => {
        if (online) {
          setProfile(await remote.signUp(input));
          setAnonymous(await remote.isAnonymousAccount());
          return;
        }
        persistLocal({
          id: `local-${Date.now()}`,
          firstName: input.firstName,
          gender: input.gender,
          city: 'الرياض',
          district: 'الملقا',
          hobbies: input.hobbies,
          privacy: { hidePhoto: input.gender === 'f', firstNameOnly: input.gender === 'f' },
        });
      },

      setHobbies: async (hobbies) => {
        if (!profile) return;
        if (online) await remote.saveHobbies(profile.id, hobbies);
        const next = { ...profile, hobbies };
        if (online) setProfile(next);
        else persistLocal(next);
        if (online) await refresh();
      },

      togglePrivacy: async (key) => {
        if (!profile) return;
        const next = { ...profile, privacy: { ...profile.privacy, [key]: !profile.privacy[key] } };
        if (online) {
          await remote.savePrivacy(profile.id, next.privacy);
          setProfile(next);
        } else persistLocal(next);
      },

      toggleMembership: async (id) => {
        if (!profile) return;
        const session = (online ? remoteSessions : sampleSessions).find((s) => s.id === id);
        if (!session || session.hostId === profile.id) return;
        const isMember = session.members.some((m) => m.id === profile.id);
        if (online) {
          if (isMember) await remote.leaveSession(id, profile.id);
          else await remote.joinSession(id, profile.id);
          await refresh();
          return;
        }
        updateSample(id, (s) => {
          if (s.gender !== profile.gender) return s;
          if (isMember) return { ...s, members: s.members.filter((m) => m.id !== profile.id) };
          if (s.capacity > 0 && s.members.length >= s.capacity) return s;
          return { ...s, members: [...s.members, { id: profile.id, name: profile.firstName }] };
        });
      },

      createSession: async (input) => {
        if (!profile) throw new Error('Not signed in');
        if (online) {
          const id = await remote.createSession(profile, input);
          await refresh();
          return id;
        }
        const id = `s${Date.now()}`;
        const venue = SAMPLE_VENUES.find((v) => v.id === input.venueId);
        const womenSlot = venue?.audience === 'both' && profile.gender === 'f' ? ' · فترة نسائية' : '';
        const me = { id: profile.id, name: profile.firstName };
        setSampleSessions((list) => [
          {
            id,
            kind: 'meetup',
            gender: profile.gender,
            hobbyId: input.hobbyId,
            venueId: input.venueId,
            startsAtLabel: formatStartsAt(input.startsAt) + womenSlot,
            level: input.level,
            hostId: profile.id,
            hostName: profile.firstName,
            capacity: hobby(input.hobbyId).groupSize,
            members: [me],
            messages: [{ id: `${id}-0`, authorId: me.id, author: me.name, text: 'أنشأت الجلسة، حياكم!', sentAt: new Date().toISOString() }],
          },
          ...list,
        ]);
        return id;
      },

      signIn: async (email, password) => {
        if (!online) throw new Error('Sign-in needs the server');
        const p = await remote.signIn(email, password);
        setAnonymous(false);
        setProfile(p);
        return p !== null;
      },

      saveAccount: async (email, password) => {
        if (!online) return;
        await remote.saveAccount(email, password);
        setAnonymous(await remote.isAnonymousAccount());
      },

      signOut: async () => {
        if (online) {
          await remote.signOut();
          setProfile(null);
          setRemoteSessions([]);
          setRemoteVenues([]);
          setRemoteMatches([]);
        } else persistLocal(null);
      },

      addSampleMessage: (id, text) => {
        if (!profile) return;
        updateSample(id, (s) => ({
          ...s,
          messages: [...s.messages, { id: `${id}-${s.messages.length}`, authorId: profile.id, author: profile.firstName, text, sentAt: new Date().toISOString() }],
        }));
      },
    };
  }, [ready, online, profile, refreshing, refresh, anonymous, remoteSessions, remoteVenues, remoteMatches, sampleSessions, persistLocal]);

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

/** Chat for one session: live from Supabase, or the sample session's messages. */
export function useChat(session: Session | undefined) {
  const { online, profile, addSampleMessage, refresh } = useApp();
  const sessionId = session?.id;
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // Opening a chat refreshes sessions so the member list and count are current.
  useEffect(() => {
    if (online && sessionId) refreshRef.current().catch(() => {});
  }, [online, sessionId]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const names = useMemo(() => {
    const n: Record<string, string> = {};
    if (session) {
      n[session.hostId] = session.hostName;
      for (const m of session.members) n[m.id] = m.name;
    }
    return n;
  }, [session]);
  const namesRef = useRef(names);
  useEffect(() => {
    namesRef.current = names;
  }, [names]);

  useEffect(() => {
    if (!online || !sessionId) return;
    let alive = true;
    remote
      .loadMessages(sessionId)
      .then((m) => alive && setMessages(m))
      .catch((e) => alive && setError(remote.errorMessage(e)));
    const unsubscribe = remote.subscribeMessages(sessionId, namesRef.current, (m) => {
      const author = m.author || namesRef.current[m.authorId];
      if (!author) {
        // Someone new joined since the session list loaded: reload to get their name.
        remote.loadMessages(sessionId).then((all) => alive && setMessages(all)).catch(() => {});
        refreshRef.current().catch(() => {});
        return;
      }
      setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, { ...m, author }]));
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [online, sessionId]);

  const send = useCallback(
    async (text: string) => {
      if (!sessionId || !profile) return;
      if (!online) {
        addSampleMessage(sessionId, text);
        return;
      }
      await remote.sendMessage(sessionId, profile.id, text);
      // Realtime delivers the message too; reload so it shows even if realtime is slow.
      setMessages(await remote.loadMessages(sessionId));
    },
    [online, sessionId, profile, addSampleMessage],
  );

  return { messages: online ? messages : (session?.messages ?? []), send, error };
}
