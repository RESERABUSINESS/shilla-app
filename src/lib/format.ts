import type { Gender, Venue } from './types';

const ar = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 1 });

/** Formats a number with Arabic-Indic digits. */
export const num = (n: number) => ar.format(n);

export const genderWorld = (g: Gender) => (g === 'f' ? 'البنات' : 'الشباب');

/** "للبنات" / "للشباب" (Arabic contracts لـ + ال into لل). */
export const forGender = (g: Gender) => (g === 'f' ? 'للبنات' : 'للشباب');

export function venueVisibleTo(v: Venue, g: Gender) {
  return v.audience === 'both' || v.audience === g;
}

/** What a viewer of gender `g` should know about when they can use the venue. */
export function venueHoursFor(v: Venue, g: Gender) {
  if (v.audience === 'f') return 'للنساء فقط';
  if (v.audience === 'm') return 'للرجال فقط';
  return (g === 'f' ? v.womenHours : v.menHours) ?? 'مشترك';
}
