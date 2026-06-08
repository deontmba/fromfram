import { test, expect } from '@playwright/test';

test.describe('Nutritionist UI Flows (Black Box Testing)', () => {
  test('should load nutritionist dashboard/recipes page', async ({ page }) => {
    // Navigate to nutritionist recipes view page
    await page.goto('/nutritionist');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
