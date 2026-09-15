const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/** "2 hours ago", "Yesterday", "3 days ago" — falls back to "Just now" under a minute. */
export function formatRelativeTime(isoDate: string): string {
  const seconds = Math.round((Date.parse(isoDate) - Date.now()) / 1000);
  const abs = Math.abs(seconds);

  for (const [unit, secondsInUnit] of UNITS) {
    if (abs >= secondsInUnit) {
      return formatter.format(Math.round(seconds / secondsInUnit), unit);
    }
  }
  return "Just now";
}
