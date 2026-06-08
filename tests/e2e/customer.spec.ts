import { test, expect } from '@playwright/test';

test.describe('Customer UI Flows (Black Box Testing)', () => {
  test('should load landing page successfully', async ({ page }) => {
    await page.goto('/');
    // Check if landing title/header or any brand text exists
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should load login page successfully', async ({ page }) => {
    await page.goto('/login');
    // Ensure email input is present
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('should load register page successfully', async ({ page }) => {
    await page.goto('/register');
    // Ensure name input is present
    const nameInput = page.locator('input[type="text"], input[name="name"]');
    await expect(nameInput).toBeVisible();
  });

  test('should load subscription plan page successfully', async ({ page }) => {
    await page.goto('/subscription');
    // Just verify the body or content is accessible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
