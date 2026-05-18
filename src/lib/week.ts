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

export function getWeekRange(date: Date) {
  const weekStart = getStartOfWeek(date);
  return {
    weekStart,
    weekEnd: getEndOfWeek(weekStart),
  };
}
