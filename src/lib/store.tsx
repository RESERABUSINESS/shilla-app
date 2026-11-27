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
import { Platform } from 'react-native';

import { SAMPLE_PEOPLE, SAMPLE_SESSIONS, SAMPLE_VENUES } from '@/data/sample';

import { formatStartsAt, venueVisibleTo } from './format';
import { hobby } from './hobbies';
import * as notify from './notifications';
import * as remote from './remote';
import { isSupabaseConfigured } from './supabase';
import type { AppNotification, ChatMessage, HobbyLevels, NotifyPrefs, Person, Profile, Session, Venue } from './types';

const DEFAULT_NOTIFY: NotifyPrefs = { push: true, messages: true, reminders: true };

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
  setHobbies: (h: HobbyLevels) => Promise<void>;
  togglePrivacy: (key: keyof Profile['privacy']) => Promise<void>;
  toggleMembership: (sessionId: string) => Promise<void>;
  createSession: (s: NewSession) => Promise<string>;
  cancelSession: (sessionId: string) => Promise<void>;
  notifications: AppNotification[];
  unread: number;
  markAllRead: () => Promise<void>;
  invite: (sessionId: string, personId: string) => Promise<void>;
  /** Accept joins the session; decline just answers the invite. */
  answerInvite: (n: AppNotification, accept: boolean) => Promise<void>;
  saveName: (firstName: string) => Promise<void>;
  setNotifyPrefs: (p: NotifyPrefs) => Promise<void>;
  suggestVenue: (s: remote.SuggestInput) => Promise<void>;
  deleteAccount: () => Promise<void>;
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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const signedInGender = profile?.gender;

  const load = useCallback(async () => {
    if (!online || !signedInGender) return;
    const [s, v, m, n] = await Promise.all([
      remote.loadSessions(),
      remote.loadVenues(),
      remote.loadMatches(signedInGender),
      remote.loadNotifications(),
    ]);
    setRemoteSessions(s);
    setRemoteVenues(v);
    setRemoteMatches(m);
    setNotifications(n);
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
        setProfile(p ? { ...p, notify: p.notify ?? DEFAULT_NOTIFY } : null);
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
    Promise.all([remote.loadSessions(), remote.loadVenues(), remote.loadMatches(signedInGender), remote.loadNotifications()])
      .then(([s, v, m, n]) => {
        if (!alive) return;
        setRemoteSessions(s);
        setRemoteVenues(v);
        setRemoteMatches(m);
        setNotifications(n);
      })
      .catch(() => {});
    // Live notifications: reload the feed and sessions when one arrives.
    const unsubscribe = remote.subscribeNotifications(signedInId, () => {
      Promise.all([remote.loadNotifications(), remote.loadSessions()])
        .then(([n, s]) => {
          if (!alive) return;
          setNotifications(n);
          setRemoteSessions(s);
        })
        .catch(() => {});
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [online, signedInId, signedInGender]);

  // Register this device for push notifications once signed in.
  const wantsPush = profile?.notify?.push;
  useEffect(() => {
    if (!online || !signedInId || !wantsPush) return;
    notify
      .getPushToken()
      .then((token) => (token ? remote.savePushToken(signedInId, token, Platform.OS) : undefined))
      .catch(() => {});
  }, [online, signedInId, wantsPush]);

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
          notify: DEFAULT_NOTIFY,
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
          if (isMember) notify.cancelReminder(id);
          else if (profile.notify.reminders) notify.scheduleReminder(session);
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
          if (profile.notify.reminders) {
            notify.scheduleReminder({ id, hobbyId: input.hobbyId, startsAt: input.startsAt.toISOString() });
          }
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

      cancelSession: async (id) => {
        if (online) {
          await remote.cancelSession(id);
          await refresh();
        } else setSampleSessions((list) => list.filter((s) => s.id !== id));
        notify.cancelReminder(id);
      },

      notifications,
      unread: notifications.filter((n) => !n.read).length,

      markAllRead: async () => {
        if (!online || !notifications.some((n) => !n.read)) return;
        setNotifications((list) => list.map((n) => ({ ...n, read: true })));
        await remote.markNotificationsRead();
      },

      invite: async (sessionId, personId) => {
        if (!profile) return;
        if (online) await remote.sendInvite(sessionId, profile.id, personId);
      },

      answerInvite: async (n, accept) => {
        if (!profile || !n.inviteId || !n.sessionId) return;
        if (accept) await remote.joinSession(n.sessionId, profile.id);
        else await remote.declineInvite(n.inviteId);
        const [list, s] = await Promise.all([remote.loadNotifications(), remote.loadSessions()]);
        setNotifications(list);
        setRemoteSessions(s);
        const joined = s.find((x) => x.id === n.sessionId);
        if (accept && joined && profile.notify.reminders) notify.scheduleReminder(joined);
      },

      saveName: async (firstName) => {
        if (!profile) return;
        const next = { ...profile, firstName: firstName.trim() };
        if (online) {
          await remote.saveName(profile.id, firstName);
          setProfile(next);
        } else persistLocal(next);
      },

      setNotifyPrefs: async (prefs) => {
        if (!profile) return;
        const next = { ...profile, notify: prefs };
        if (online) {
          await remote.saveNotifyPrefs(profile.id, prefs);
          setProfile(next);
        } else persistLocal(next);
        if (!prefs.reminders) notify.cancelAllReminders();
      },

      suggestVenue: async (input) => {
        if (!online) throw new Error('Suggesting a place needs the server');
        await remote.suggestVenue(input);
        await refresh();
      },

      deleteAccount: async () => {
        if (online) await remote.deleteAccount();
        notify.cancelAllReminders();
        setProfile(null);
        setRemoteSessions([]);
        setRemoteVenues([]);
        setRemoteMatches([]);
        setNotifications([]);
        if (!online) persistLocal(null);
      },

      signOut: async () => {
        notify.cancelAllReminders();
        if (online) {
          await remote.signOut();
          setProfile(null);
          setRemoteSessions([]);
          setRemoteVenues([]);
          setRemoteMatches([]);
          setNotifications([]);
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
  }, [ready, online, profile, refreshing, refresh, anonymous, remoteSessions, remoteVenues, remoteMatches, sampleSessions, notifications, persistLocal]);

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
