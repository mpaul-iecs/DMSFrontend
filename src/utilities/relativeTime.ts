const RTF = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const WEEKDAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const MONTH_DAY_FORMAT = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const MONTH_DAY_YEAR_FORMAT = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

const DAY_MS = 86400000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * WhatsApp/Slack-style tiered relative time — no moment.js needed, Intl already covers this:
 * "Just now" (<1min) → "Xm ago" (<1h) → "Xh ago" (rest of today) → "Yesterday" →
 * weekday name (rest of the last 7 days) → "Mon D" (this year) → "Mon D, YYYY" (older).
 * Day boundaries are calendar-day based (local midnight), not a raw 24h/168h window, so
 * "Yesterday" means "the previous calendar day" the way every chat/mail app means it.
 */
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) return "Just now";
  if (absSeconds < 3600) return RTF.format(Math.round(diffSeconds / 60), "minute");

  const dayDiff = Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS);

  if (dayDiff === 0) return RTF.format(Math.round(diffSeconds / 3600), "hour");
  if (dayDiff === -1) return "Yesterday";
  if (dayDiff === 1) return "Tomorrow";
  if (dayDiff < 0 && dayDiff > -7) return WEEKDAY_FORMAT.format(date);

  return date.getFullYear() === now.getFullYear()
    ? MONTH_DAY_FORMAT.format(date)
    : MONTH_DAY_YEAR_FORMAT.format(date);
}
