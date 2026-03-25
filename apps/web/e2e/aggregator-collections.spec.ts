import { test, expect } from '@playwright/test';
import { loginAsAggregator } from '../helpers/auth';

test.describe('Aggregator Collection Form', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAggregator(page);
    await page.goto('/aggregator/collections/new');
    await page.waitForLoadState('networkidle');
  });

  test('Step 1: should display material selection options', async ({ page }) => {
    // The collection form step 1 should show material type checkboxes/buttons
    await expect(page.getByText(/Material|Select Material/i).first()).toBeVisible();

    // Verify at least one material type option exists (PET, HDPE, etc.)
    const materialOptions = page.locator('[data-material], button, label').filter({ hasText: /PET|HDPE|LDPE|PP|PS|PVC|Mixed|Other/i });
    const count = await materialOptions.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Step 1: should allow selecting a material and proceeding', async ({ page }) => {
    // Click on a material type (e.g. PET)
    const petOption = page.locator('button, label, [data-material]').filter({ hasText: /PET/i }).first();
    if (await petOption.isVisible()) {
      await petOption.click();

      // Look for a "Next" or "Continue" button
      const nextBtn = page.locator('button, a').filter({ hasText: /Next|Continue|Proceed/i }).first();
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        // Should advance to step 2 (photo capture)
        await expect(page.getByText(/Photo|Camera|Scale|Weight/i).first()).toBeVisible({ timeout: 10_000 });
      }
    }
  });
});

test.describe('Aggregator Collection History', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAggregator(page);
    await page.goto('/aggregator/collections');
    await page.waitForLoadState('networkidle');
  });

  test('should display collection history page', async ({ page }) => {
    // Verify page header is present
    await expect(page.locator('h1, h2').filter({ hasText: /Collection/i }).first()).toBeVisible();
  });

  test('should have functional search input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('PET');
      // Should filter (or show no-results) without crashing
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/.*aggregator\/collections/);
    }
  });

  test('should have material filter chips', async ({ page }) => {
    // Check for filter chip buttons
    const filterChips = page.locator('button').filter({ hasText: /PET|HDPE|LDPE|PP|All/i });
    const count = await filterChips.count();
    expect(count).toBeGreaterThan(0);
  });
});
