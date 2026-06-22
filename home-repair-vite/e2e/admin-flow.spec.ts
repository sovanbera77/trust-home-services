import { test, expect } from '@playwright/test';

test.describe('Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('select').first().selectOption('admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button.btn-primary');
    await expect(page).toHaveURL('/admin');
  });

  test('admin dashboard shows main tabs', async ({ page }) => {
    await expect(page.locator('button:has-text("Dockets")')).toBeVisible();
    await expect(page.locator('button:has-text("Users")')).toBeVisible();
    await expect(page.locator('button:has-text("Inventory")')).toBeVisible();
    await expect(page.locator('button:has-text("Complaints")')).toBeVisible();
  });
});
