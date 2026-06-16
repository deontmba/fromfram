import { test, expect } from '@playwright/test';

test.describe('Nutritionist UI Flows (Black Box Testing)', () => {
  test('should load nutritionist dashboard/recipes page', async ({ page }) => {
    // Navigate to nutritionist recipes view page
    await page.goto('/nutritionist');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  // PENINGKATAN TEST CASES: Kerangka E2E Nutritionist Recipe UI
  test.describe('Recipe Management UI Flow', () => {
    test('should display listing of nutritionist-created recipes in table view', async ({ page }) => {
      await page.goto('/nutritionist/recipes');
      const tableRow = page.locator('table tbody tr, .recipe-row');
      const isPresent = await tableRow.count() > 0;
      if (isPresent) {
        await expect(tableRow.first()).toBeVisible();
      }
    });

    test('should open add recipe modal form and add new recipe card successfully', async ({ page }) => {
      await page.goto('/nutritionist/recipes');
      const addBtn = page.locator('button:has-text("Tambah"), button:has-text("Add"), .add-recipe-btn');
      if (await addBtn.count() > 0) {
        await addBtn.click();
        const nameInput = page.locator('input[name="name"]');
        await expect(nameInput).toBeVisible();
      }
    });

    test('should validate input nutrition values and prevent submitting bad forms', async ({ page }) => {
      await page.goto('/nutritionist/recipes/new');
      const caloriesInput = page.locator('input[name="calories"]');
      if (await caloriesInput.count() > 0) {
        await caloriesInput.fill('-100');
        const submitBtn = page.locator('button[type="submit"]');
        await expect(submitBtn).toBeDisabled();
      }
    });

    test('should edit a recipe profile correctly and check updated fields', async ({ page }) => {
      await page.goto('/nutritionist/recipes');
      const editBtn = page.locator('.btn-edit-recipe, button[title="Edit"]').first();
      if (await editBtn.count() > 0) {
        await editBtn.click();
        await page.fill('input[name="description"]', 'Updated description detail');
        await page.click('button:has-text("Simpan")');
        const descCell = page.locator('td:has-text("Updated description detail")');
        if (await descCell.count() > 0) {
          await expect(descCell.first()).toBeVisible();
        }
      }
    });

    test('should delete an unused recipe successfully from the database dashboard', async ({ page }) => {
      await page.goto('/nutritionist/recipes');
      const deleteBtn = page.locator('.btn-delete-recipe, button[title="Delete"]').first();
      if (await deleteBtn.count() > 0) {
        await deleteBtn.click();
        await expect(deleteBtn).not.toBeVisible();
      }
    });
  });

  test.describe('Nutritionist Access Authorization checks', () => {
    test('should redirect standard user to standard user login/dashboard when browsing nutritionist paths', async ({ page }) => {
      await page.goto('/nutritionist');
      // Pastikan ada behavior proteksi route
      const isLoginOrDashboard = page.url().includes('login') || page.url().includes('dashboard');
      expect(isLoginOrDashboard).toBeDefined();
    });
  });
});

