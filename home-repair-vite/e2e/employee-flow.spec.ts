import { test, expect } from '@playwright/test';

test.describe('Employee Flow', () => {
  test('employee can login and see dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.locator('select').first().selectOption('employee');

    const empSelect = page.locator('select').nth(1);
    await expect(empSelect).toBeVisible();
    await empSelect.selectOption('emp1');

    await page.fill('input[type="password"]', 'emp123');
    await page.click('button.btn-primary');
    await expect(page).toHaveURL('/employee');

    await expect(page.locator('h2:has-text("My Assigned Jobs")')).toBeVisible();
  });
});
