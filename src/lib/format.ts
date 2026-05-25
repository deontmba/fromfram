/**
 * Formats a Date into a human-readable relative time string in Indonesian.
 * Example: "5 menit lalu", "2 jam lalu", "3 hari lalu"
 */
export function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return 'Belum tersedia';

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;

  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 24) return `${diffHours} jam lalu`;

  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 7) return `${diffDays} hari lalu`;

  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks} minggu lalu`;
}
