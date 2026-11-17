export const DAYS_OF_WEEK = [
  'SENIN',
  'SELASA',
  'RABU',
  'KAMIS',
  'JUMAT',
  'SABTU',
  'MINGGU',
] as const;

export type DayKey = (typeof DAYS_OF_WEEK)[number];

export function getStartOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

export function getEndOfWeek(date: Date) {
  const end = getStartOfWeek(date);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getNextWeekStart(date: Date) {
  const next = getStartOfWeek(date);
  next.setDate(next.getDate() + 7);
  return next;
}

// Indonesia (WIB) is UTC+7 all year, no daylight saving.
const WIB_MS = 7 * 60 * 60 * 1000;

/**
 * The instant of hours:minutes Jakarta time on the Jakarta calendar day of `day`.
 * Works the same whether the server clock is UTC (Vercel) or WIB (local dev).
 * shortcut: week boundaries above still use the server clock; moving them needs a data migration of stored weekStartDate values.
 */
export function atJakartaTime(day: Date, hours: number, minutes = 0) {
  const wib = new Date(day.getTime() + WIB_MS);
  wib.setUTCHours(hours, minutes, 0, 0);
  return new Date(wib.getTime() - WIB_MS);
}

const JS_DAY_TO_ENUM = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'] as const;

/** DayOfWeek enum of the Jakarta calendar day that contains `date`. */
export function jakartaDayOfWeek(date: Date): DayKey {
  return JS_DAY_TO_ENUM[new Date(date.getTime() + WIB_MS).getUTCDay()];
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
