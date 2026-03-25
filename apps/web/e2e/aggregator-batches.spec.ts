import { test, expect } from '@playwright/test';
import { loginAsAggregator } from '../helpers/auth';

test.describe('Aggregator Batch Manager', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAggregator(page);
    await page.goto('/aggregator/batches');
    await page.waitForLoadState('networkidle');
  });

  test('should display batch manager page', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /Batch/i }).first()).toBeVisible();
  });

  test('should have Active and Completed tabs', async ({ page }) => {
    const activeTab = page.locator('button, a').filter({ hasText: /Active/i }).first();
    const completedTab = page.locator('button, a').filter({ hasText: /Completed|Complete/i }).first();

    await expect(activeTab).toBeVisible();
    await expect(completedTab).toBeVisible();
  });

  test('should navigate to Create Batch page', async ({ page }) => {
    const createBtn = page.locator('a[href*="create"], a[href*="new"], button').filter({ hasText: /Create|New Batch/i }).first();

    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForURL(/.*batches\/(create|new)/, { timeout: 15_000 });
    }
  });

  test('should switch between Active and Completed tabs', async ({ page }) => {
    const completedTab = page.locator('button, a').filter({ hasText: /Completed|Complete/i }).first();
    if (await completedTab.isVisible()) {
      await completedTab.click();
      await page.waitForTimeout(500);
      // Page should still be on batches
      await expect(page).toHaveURL(/.*aggregator\/batches/);
    }
  });
});
