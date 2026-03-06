/**
 * RECCO IST Timezone Utilities
 * Phase 2 Module 2.2 — India Standard Time (UTC+5:30)
 *
 * All "today" boundaries use IST midnight, not UTC midnight.
 * Indian number formatting (lakhs/crores) for ₹ values.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +5:30 in milliseconds

/**
 * Returns a Date object representing midnight IST today (as a UTC timestamp).
 * Used for all "today" query boundaries.
 */
export function getTodayISTMidnight(): Date {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  istNow.setUTCHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - IST_OFFSET_MS);
}

/**
 * Returns a Date object representing midnight IST tomorrow (as a UTC timestamp).
 */
export function getTomorrowISTMidnight(): Date {
  const today = getTodayISTMidnight();
  return new Date(today.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Formats a UTC date/string as IST for display.
 * Output: "14 Feb 2026, 6:32 PM IST"
 */
export function formatISTTimestamp(utcDate: Date | string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }) + ' IST';
}

/**
 * Formats a number in Indian rupee notation with lakhs/crores.
 * ₹12,34,567 (not ₹1,234,567).
 */
export function formatINR(amount: number): string {
  if (amount === 0) return '₹0';
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'INR',
  });
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Returns relative time string for display.
 * "Just now", "2 minutes ago", "3 hours ago", "2 days ago"
 */
export function getRelativeTime(utcDate: Date | string): string {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return formatISTTimestamp(date);
}

/**
 * Returns the start of the current India Financial Year (April 1).
 */
export function getIndiaFYStart(): Date {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const year = istNow.getUTCMonth() >= 3 ? istNow.getUTCFullYear() : istNow.getUTCFullYear() - 1;
  const fyStart = new Date(Date.UTC(year, 3, 1, 0, 0, 0, 0));
  return new Date(fyStart.getTime() - IST_OFFSET_MS);
}
