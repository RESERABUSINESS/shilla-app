// Domain types. Field names mirror the Supabase schema
// (supabase/migrations) in camelCase.

/** Verified gender. Comes from identity verification and never changes. */
export type Gender = 'm' | 'f';

/** Who a venue serves: men only, women only, or both at separate times. */
export type VenueAudience = 'm' | 'f' | 'both';

/** hobbyId -> level index (0 beginner, 1 intermediate, 2 advanced). */
export type HobbyLevels = Record<string, number>;

export type Profile = {
  id: string;
  firstName: string;
  gender: Gender;
  city: string;
  district: string;
  hobbies: HobbyLevels;
  privacy: { hidePhoto: boolean; firstNameOnly: boolean };
  notify: NotifyPrefs;
};

export type NotifyPrefs = { push: boolean; messages: boolean; reminders: boolean };

export type AppNotification = {
  id: string;
  kind: 'joined' | 'invite' | 'cancelled';
  sessionId?: string;
  inviteId?: string;
  inviteStatus?: 'pending' | 'accepted' | 'declined';
  actorName?: string;
  hobbyId?: string;
  read: boolean;
  createdAt: string;
};

export type Venue = {
  id: string;
  name: string;
  kind: string;
  district: string;
  hobbies: string[];
  audience: VenueAudience;
  /** Shown to men when audience is 'both', e.g. "٨ م – ١٢ ص للرجال". */
  menHours?: string;
  /** Shown to women when audience is 'both', e.g. "٤–٧ م فترة نسائية". */
  womenHours?: string;
  priceLabel: string;
  rating: number;
  distanceKm: number;
  latitude?: number;
  longitude?: number;
  /** False for places imported from OpenStreetMap or suggested by users. */
  verified?: boolean;
  source?: 'manual' | 'osm' | 'owner' | 'user';
};

export type SessionKind = 'meetup' | 'workshop';

export type ChatMessage = { id: string; authorId: string; author: string; text: string; sentAt: string };

/** A person taking part in a session. */
export type Member = { id: string; name: string };

export type Session = {
  id: string;
  kind: SessionKind;
  /** Sessions are always locked to one gender: the creator's. */
  gender: Gender;
  hobbyId: string;
  venueId: string;
  startsAtLabel: string;
  /** ISO time; used for reminders. Missing in sample data. */
  startsAt?: string;
  level: number;
  hostId: string;
  hostName: string;
  /** Capacity. 0 = open group. For workshops, the number of seats. */
  capacity: number;
  members: Member[];
  /** Venue name, so the card can show it even when the venue is outside the nearby list. */
  venueName?: string;
  /** Workshops only. */
  priceSar?: number;
  durationLabel?: string;
  /** Only used in sample mode; with Supabase, chat loads per session. */
  messages: ChatMessage[];
};

export type Person = {
  id: string;
  firstName: string;
  gender: Gender;
  hobbies: HobbyLevels;
  distanceKm: number;
  availability: string;
};
