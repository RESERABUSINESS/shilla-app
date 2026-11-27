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

const AR_WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** Next seven days as picker options: اليوم، بكرة، then weekday names. */
export function dayOptions(now = new Date()): { label: string; date: Date }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    return { label: i === 0 ? 'اليوم' : i === 1 ? 'بكرة' : AR_WEEKDAYS[date.getDay()], date };
  });
}

/** Start-time options as [label, hour, minute]. */
export const TIME_OPTIONS: [string, number, number][] = [
  ['٦:٠٠ ص', 6, 0],
  ['١٠:٠٠ ص', 10, 0],
  ['٤:٠٠ م', 16, 0],
  ['٦:٠٠ م', 18, 0],
  ['٨:٠٠ م', 20, 0],
  ['٩:٣٠ م', 21, 30],
];

export function combineDayTime(day: Date, hour: number, minute: number) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
}

/** "الخميس · ٨:٠٠ م" in local time. */
export function formatStartsAt(d: Date) {
  const h = d.getHours();
  const time = `${num(h % 12 === 0 ? 12 : h % 12)}:${String(d.getMinutes()).padStart(2, '0').replace(/\d/g, (x) => '٠١٢٣٤٥٦٧٨٩'[Number(x)])} ${h < 12 ? 'ص' : 'م'}`;
  return `${AR_WEEKDAYS[d.getDay()]} · ${time}`;
}

/** "٣ ساعات" / "ساعتين ونص" style label from minutes. */
export function formatDuration(minutes: number) {
  const h = minutes / 60;
  if (h === 1) return 'ساعة';
  if (h === 2) return 'ساعتين';
  return `${num(h)} ساعات`;
}
