import { test, expect } from '@playwright/test';
import { loginAsAggregator } from './helpers/auth';

test.describe('Aggregator Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAggregator(page);
  });

  test('should display 4 stat cards', async ({ page }) => {
    // Verify the 4 stat cards are visible
    await expect(page.getByText("Today's Collections")).toBeVisible();
    await expect(page.getByText('Active Batches')).toBeVisible();
    await expect(page.getByText('Pending Output')).toBeVisible();
    await expect(page.getByText('Fraud Score')).toBeVisible();
  });

  test('should display Recent Activity section', async ({ page }) => {
    await expect(page.getByText('Recent Activity')).toBeVisible();
  });

  test('should have working New Collection button', async ({ page }) => {
    // Click the "New" / "New Collection" button
    const newBtn = page.locator('a[href="/aggregator/collections/new"]').first();
    await expect(newBtn).toBeVisible();
    await newBtn.click();

    await page.waitForURL('**/aggregator/collections/new', { timeout: 15_000 });
    await expect(page).toHaveURL(/.*collections\/new/);
  });

  test('should navigate to Collections page via sidebar/nav', async ({ page }) => {
    const collectionsLink = page.locator('a[href="/aggregator/collections"]').first();
    await collectionsLink.click();

    await page.waitForURL('**/aggregator/collections', { timeout: 15_000 });
    await expect(page).toHaveURL(/.*aggregator\/collections/);
  });

  test('should navigate to Batches page via sidebar/nav', async ({ page }) => {
    const batchesLink = page.locator('a[href="/aggregator/batches"]').first();
    await batchesLink.click();

    await page.waitForURL('**/aggregator/batches', { timeout: 15_000 });
    await expect(page).toHaveURL(/.*aggregator\/batches/);
  });

  test('should navigate to Payments page via sidebar/nav', async ({ page }) => {
    const paymentsLink = page.locator('a[href="/aggregator/payments"]').first();
    await paymentsLink.click();

    await page.waitForURL('**/aggregator/payments', { timeout: 15_000 });
    await expect(page).toHaveURL(/.*aggregator\/payments/);
  });
});
