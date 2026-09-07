const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * 1024;

export function formatFileSize(bytes: number): string {
  if (bytes < BYTES_PER_KB) return `${bytes} B`;
  if (bytes < BYTES_PER_MB) return `${(bytes / BYTES_PER_KB).toFixed(1)} KB`;
  return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/** "3 days ago" reads faster than a date, and rows differ at a glance. */
export function formatRelativeTime(iso: string): string {
  const difference = new Date(iso).getTime() - Date.now();
  const distance = Math.abs(difference);
  if (distance < MINUTE) return "just now";
  if (distance < HOUR) return relative.format(Math.round(difference / MINUTE), "minute");
  if (distance < DAY) return relative.format(Math.round(difference / HOUR), "hour");
  if (distance < WEEK) return relative.format(Math.round(difference / DAY), "day");
  if (distance < MONTH) return relative.format(Math.round(difference / WEEK), "week");
  if (distance < YEAR) return relative.format(Math.round(difference / MONTH), "month");
  return relative.format(Math.round(difference / YEAR), "year");
}
