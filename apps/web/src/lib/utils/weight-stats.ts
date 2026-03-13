/**
 * Canonical Weight Computation Utilities (FIX 9)
 * Used in Collection Form Step 2 (display), Step 4 (review), and submitCollection Server Action.
 * NEVER reimplement inline — always import from here to prevent client/server divergence.
 */

/**
 * Compute the median of exactly 3 weight readings, rounded to 2 decimal places.
 * Median is the middle value of the sorted array — NOT the mean/average.
 */
export function computeMedianWeight(weights: [number, number, number]): number {
  const sorted = [...weights].sort((a, b) => a - b);
  return Math.round(sorted[1] * 100) / 100;
}

/**
 * Compute the variance percentage of 3 weight readings.
 * Variance = (max - min) / median * 100, rounded to 1 decimal place.
 */
export function computeWeightVariancePct(weights: [number, number, number]): number {
  const median = computeMedianWeight(weights);
  if (median === 0) return 0;
  const range = Math.max(...weights) - Math.min(...weights);
  return Math.round((range / median) * 100 * 10) / 10;
}
