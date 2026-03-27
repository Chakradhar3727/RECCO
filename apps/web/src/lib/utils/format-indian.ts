/**
 * Indian Number Formatting Utilities for RECCO
 * Uses the Indian numbering system (Lakh/Crore) via en-IN locale.
 */

/**
 * Format a number with Indian comma grouping. E.g. 1,23,456
 */
export function formatIndianNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

/**
 * Format weight in kg with Indian comma grouping. E.g. "1,234.50 kg"
 */
export function formatWeightKg(value: number): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} kg`;
}

/**
 * Format currency in INR. E.g. "₹12,345"
 */
export function formatINR(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
