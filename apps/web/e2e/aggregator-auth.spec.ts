import { test, expect } from '@playwright/test';
import { loginAsAggregator } from '../helpers/auth';

test.describe('Aggregator Authentication', () => {
  test('should display login page with email and PIN inputs', async ({ page }) => {
    await page.goto('/aggregator/login');
    await page.waitForLoadState('networkidle');

    // Verify page elements
    await expect(page.locator('h1')).toContainText('Aggregator Login');
    await expect(page.locator('#agg-email')).toBeVisible();
    await expect(page.locator('input[inputmode="numeric"]')).toHaveCount(4);
  });

  test('should show error on invalid PIN', async ({ page }) => {
    await page.goto('/aggregator/login');
    await page.waitForLoadState('networkidle');

    const email = process.env.TEST_AGGREGATOR_EMAIL;
    if (!email) {
      test.skip(true, 'TEST_AGGREGATOR_EMAIL not set');
      return;
    }

    await page.locator('#agg-email').fill(email);

    // Enter wrong PIN
    const pinInputs = page.locator('input[inputmode="numeric"]');
    for (let i = 0; i < 4; i++) {
      await pinInputs.nth(i).fill('0');
    }

    // Should show error message (not redirect)
    await expect(page.getByText(/Invalid PIN|Account not found/i)).toBeVisible({ timeout: 10_000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginAsAggregator(page);

    // Should be on the dashboard
    await expect(page).toHaveURL(/.*aggregator\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
