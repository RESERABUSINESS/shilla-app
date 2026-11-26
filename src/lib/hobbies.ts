// Hobby catalog. Hobbies are DATA, not code: this list mirrors
// supabase/seed.sql. Adding a hobby means adding a row (and here, until the
// app loads the catalog from the database), never a new screen.

export type CategoryId = 'sport' | 'craft' | 'culture' | 'food' | 'adventure' | 'games';

export type Hobby = {
  id: string;
  category: CategoryId;
  name: string;
  emoji: string;
  /** Typical group size. 0 = open group with no cap. */
  groupSize: number;
  /** Plays in two teams (football, basketball...). */
  teams?: boolean;
  /** Human description of the group size, shown when creating a session. */
  groupLabel: string;
  /** Three level labels, beginner to advanced. Defaults to LEVELS. */
  levels?: [string, string, string];
};

export const CATEGORIES: Record<CategoryId, string> = {
  sport: 'رياضة',
  craft: 'فنون وحِرف',
  culture: 'ثقافة',
  food: 'طبخ وقهوة',
  adventure: 'مغامرات',
  games: 'ألعاب',
};

export const LEVELS: [string, string, string] = ['مبتدئ', 'متوسط', 'محترف'];

export const HOBBIES: Hobby[] = [
  { id: 'padel', category: 'sport', name: 'بادل', emoji: '🏓', groupSize: 4, groupLabel: '٤ لاعبين (زوجي)' },
  { id: 'tennis', category: 'sport', name: 'تنس', emoji: '🎾', groupSize: 2, groupLabel: 'لاعبَين (أو ٤ زوجي)' },
  { id: 'football', category: 'sport', name: 'كرة قدم', emoji: '⚽', groupSize: 10, teams: true, groupLabel: 'فريقين، ٥ ضد ٥' },
  { id: 'basketball', category: 'sport', name: 'كرة سلة', emoji: '🏀', groupSize: 6, teams: true, groupLabel: 'فريقين، ٣ ضد ٣' },
  { id: 'running', category: 'sport', name: 'جري', emoji: '🏃', groupSize: 0, groupLabel: 'مجموعة مفتوحة', levels: ['أبطأ من ٧ د/كم', '٥–٧ د/كم', 'أسرع من ٥ د/كم'] },
  { id: 'swimming', category: 'sport', name: 'سباحة', emoji: '🏊', groupSize: 0, groupLabel: 'مجموعة مفتوحة' },
  { id: 'yoga', category: 'sport', name: 'يوغا', emoji: '🧘', groupSize: 0, groupLabel: 'مجموعة مفتوحة' },
  { id: 'pottery', category: 'craft', name: 'فخار', emoji: '🏺', groupSize: 8, groupLabel: '٤ إلى ٨ مشاركين', levels: ['أول مرة', 'جربت قبل', 'أشتغل على العجلة'] },
  { id: 'painting', category: 'craft', name: 'رسم', emoji: '🎨', groupSize: 10, groupLabel: '٤ إلى ١٠ مشاركين' },
  { id: 'calligraphy', category: 'craft', name: 'خط عربي', emoji: '✒️', groupSize: 8, groupLabel: 'حتى ٨ مشاركين' },
  { id: 'crochet', category: 'craft', name: 'كروشيه', emoji: '🧶', groupSize: 8, groupLabel: 'حتى ٨ مشاركين' },
  { id: 'reading', category: 'culture', name: 'نادي قراءة', emoji: '📚', groupSize: 12, groupLabel: '٦ إلى ١٢ عضو', levels: ['قارئ جديد', 'كتاب بالشهر', 'قارئ نهم'] },
  { id: 'photography', category: 'culture', name: 'تصوير', emoji: '📷', groupSize: 0, groupLabel: 'جولة مفتوحة', levels: ['جوال', 'كاميرا مبتدئ', 'محترف'] },
  { id: 'coffee', category: 'food', name: 'قهوة مختصة', emoji: '☕', groupSize: 10, groupLabel: 'حتى ١٠ مشاركين', levels: ['أحبها وبس', 'أحضّر في البيت', 'باريستا'] },
  { id: 'cooking', category: 'food', name: 'طبخ', emoji: '🍳', groupSize: 8, groupLabel: 'حتى ٨ مشاركين' },
  { id: 'hiking', category: 'adventure', name: 'هايكنج', emoji: '🥾', groupSize: 0, groupLabel: 'مجموعة مفتوحة', levels: ['مسارات سهلة', 'متوسطة', 'صعبة'] },
  { id: 'camping', category: 'adventure', name: 'تخييم', emoji: '⛺', groupSize: 0, groupLabel: 'مجموعة مفتوحة' },
  { id: 'chess', category: 'games', name: 'شطرنج', emoji: '♟️', groupSize: 2, groupLabel: 'لاعبَين', levels: ['تقييم تحت ١٢٠٠', '١٢٠٠–١٦٠٠', 'فوق ١٦٠٠'] },
  { id: 'board_games', category: 'games', name: 'ألعاب لوحية', emoji: '🎲', groupSize: 6, groupLabel: '٤ إلى ٦ لاعبين' },
  { id: 'gaming', category: 'games', name: 'ألعاب إلكترونية', emoji: '🎮', groupSize: 4, groupLabel: 'فريق من ٤' },
];

const BY_ID = new Map(HOBBIES.map((h) => [h.id, h]));

export function hobby(id: string): Hobby {
  const h = BY_ID.get(id);
  if (!h) throw new Error(`Unknown hobby: ${id}`);
  return h;
}

export function levelLabel(hobbyId: string, level: number): string {
  return (hobby(hobbyId).levels ?? LEVELS)[level] ?? LEVELS[1];
}

/** "لاعبين" for sports and games, "مشاركين" for everything else. */
export function participantsWord(hobbyId: string): string {
  const c = hobby(hobbyId).category;
  return c === 'sport' || c === 'games' ? 'لاعبين' : 'مشاركين';
}
