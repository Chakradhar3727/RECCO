import { Page, expect } from '@playwright/test';

/**
 * RECCO — Playwright Auth Helper
 *
 * Logs into the Aggregator portal via Email + 4-digit PIN.
 * The PIN input uses the OtpPinInput component (4 individual <input> boxes).
 *
 * Environment variables required:
 *   TEST_AGGREGATOR_EMAIL  – e.g. "test@recco.com"
 *   TEST_AGGREGATOR_PIN    – e.g. "1234"
 */
export async function loginAsAggregator(page: Page): Promise<void> {
  const email = process.env.TEST_AGGREGATOR_EMAIL;
  const pin = process.env.TEST_AGGREGATOR_PIN;

  if (!email || !pin) {
    throw new Error(
      'Missing TEST_AGGREGATOR_EMAIL or TEST_AGGREGATOR_PIN env vars. ' +
      'Set them in .env.local or pass via CLI.'
    );
  }

  // Navigate to the Aggregator login page
  await page.goto('/aggregator/login');
  await page.waitForLoadState('networkidle');

  // Fill the email field
  const emailInput = page.locator('#agg-email');
  await emailInput.fill(email);

  // Type PIN digits into the OTP input boxes (4 individual inputs)
  const pinInputs = page.locator('input[inputmode="numeric"]');
  await expect(pinInputs).toHaveCount(4);

  for (let i = 0; i < 4; i++) {
    await pinInputs.nth(i).fill(pin[i]);
  }

  // Wait for redirect to dashboard (verifyAggregatorPin → router.push)
  await page.waitForURL('**/aggregator/dashboard', { timeout: 30_000 });
}
