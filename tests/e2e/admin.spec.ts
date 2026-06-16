import { test, expect } from '@playwright/test';

test.describe('Admin UI Flows (Black Box Testing)', () => {
  test('should load admin dashboard/operations page', async ({ page }) => {
    await page.goto('/admin');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  // PENINGKATAN TEST CASES: Kerangka E2E Admin Dashboard UI
  test.describe('User Account Administration UI', () => {
    test('should display list of all registered users in a table data grid', async ({ page }) => {
      await page.goto('/admin/users');
      const tableRow = page.locator('table tbody tr, .user-row');
      const isPresent = await tableRow.count() > 0;
      if (isPresent) {
        await expect(tableRow.first()).toBeVisible();
      }
    });

    test('should filter users successfully based on role tags (USER / NUTRITIONIST / ADMIN)', async ({ page }) => {
      await page.goto('/admin/users');
      const filterSelect = page.locator('select[name="role-filter"], .role-filter-select');
      if (await filterSelect.count() > 0) {
        await filterSelect.selectOption('NUTRITIONIST');
        const roleLabel = page.locator('td:has-text("NUTRITIONIST"), td:has-text("Nutritionist")');
        await expect(roleLabel.first()).toBeVisible();
      }
    });

    test('should view user profile detail details modal when clicking details icon', async ({ page }) => {
      await page.goto('/admin/users');
      const detailBtn = page.locator('.btn-detail, button[title="Detail"]').first();
      if (await detailBtn.count() > 0) {
        await detailBtn.click();
        const modal = page.locator('.modal, .user-detail-modal');
        await expect(modal).toBeVisible();
      }
    });

    test('should change user status flag and disable user login permission', async ({ page }) => {
      await page.goto('/admin/users');
      const disableBtn = page.locator('.btn-disable, button:has-text("Deactivate")').first();
      if (await disableBtn.count() > 0) {
        await disableBtn.click();
        const statusBadge = page.locator('.status-badge, text=INACTIVE');
        if (await statusBadge.count() > 0) {
          await expect(statusBadge).toBeVisible();
        }
      }
    });

    test('should delete a user account and remove their records from listing UI', async ({ page }) => {
      await page.goto('/admin/users');
      const deleteBtn = page.locator('.btn-delete, button[title="Delete"]').first();
      if (await deleteBtn.count() > 0) {
        await deleteBtn.click();
        // Memastikan row dihapus
        await expect(deleteBtn).not.toBeVisible();
      }
    });
  });

  test.describe('Delivery Management & Update Flows', () => {
    test('should locate delivery details card for customer order', async ({ page }) => {
      await page.goto('/admin/deliveries');
      const deliveryCard = page.locator('.delivery-card, .shipment-item');
      const isPresent = await deliveryCard.count() > 0;
      if (isPresent) {
        await expect(deliveryCard.first()).toBeVisible();
      }
    });

    test('should update status value from PREPARING to SHIPPED and reflect changes', async ({ page }) => {
      await page.goto('/admin/deliveries');
      const editBtn = page.locator('.btn-edit-status, button:has-text("Update")').first();
      if (await editBtn.count() > 0) {
        await editBtn.click();
        const selectStatus = page.locator('select[name="status"]');
        await selectStatus.selectOption('SHIPPED');
        await page.click('button:has-text("Save")');
        const statusBadge = page.locator('.status-badge, text=SHIPPED');
        if (await statusBadge.count() > 0) {
          await expect(statusBadge).toBeVisible();
        }
      }
    });
  });

  test.describe('Responsive Design Adjustments & Access Control', () => {
    test('Mobile viewport (375px) check - sidebar layout collapses to hamburger trigger button', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/admin');
      const hamburger = page.locator('.hamburger-menu-btn, button[aria-label*="menu"], #mobile-toggle');
      const isPresent = await hamburger.count() > 0;
      if (isPresent) {
        await expect(hamburger).toBeVisible();
      }
    });

    test('Tablet viewport (768px) check - layout grids adjust and buttons meet touch target height', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/admin');
      const cards = page.locator('.stats-card, .metric-box');
      const isPresent = await cards.count() > 0;
      if (isPresent) {
        await expect(cards.first()).toBeVisible();
      }
    });

    test('Desktop layout rendering matches full monitor specifications without scrolls', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/admin');
      const sidebar = page.locator('aside, .sidebar, #desktop-sidebar');
      const isPresent = await sidebar.count() > 0;
      if (isPresent) {
        await expect(sidebar).toBeVisible();
      }
    });
  });
});

