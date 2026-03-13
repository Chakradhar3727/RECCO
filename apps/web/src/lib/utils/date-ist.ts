/**
 * IST Timezone Utilities for RECCO
 * India Standard Time = UTC + 5:30
 * Uses explicit offset arithmetic — no Intl API dependency for Edge Runtime.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +5:30 in milliseconds

/**
 * Returns today's date boundaries in IST as UTC Date objects.
 * Used for "Today's Collections" queries.
 */
export function getTodayIST(): { startOfDay: Date; endOfDay: Date } {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);

  const startOfDay = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate())
  );
  // Convert back to UTC for Supabase query
  const startUTC = new Date(startOfDay.getTime() - IST_OFFSET_MS);
  const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);

  return { startOfDay: startUTC, endOfDay: endUTC };
}

/**
 * Format a date to IST display string. E.g. "13 Mar 2026, 2:50 PM"
 */
export function formatDateIST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const istDate = new Date(d.getTime() + IST_OFFSET_MS);

  const day = istDate.getUTCDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[istDate.getUTCMonth()];
  const year = istDate.getUTCFullYear();

  let hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

/**
 * Format relative time from now. E.g. "2 min ago", "1 hr ago", "Yesterday"
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  if (diffDay === 1) return 'Yesterday';
  return `${diffDay} days ago`;
}
