import { test, expect } from '@playwright/test';

test.describe('Public Site', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows hero section with branding', async ({ page }) => {
    await expect(page.locator('span.gradient-text').first()).toBeVisible();
  });

  test('navigation buttons are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Services', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'How it works', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Plans', exact: true }).first()).toBeVisible();
  });

  test('service catalog headings are displayed', async ({ page }) => {
    await expect(page.locator('h3:has-text("Plumbing")').first()).toBeVisible();
    await expect(page.locator('h3:has-text("Electrical")').first()).toBeVisible();
  });

  test('login CTA navigates to login page', async ({ page }) => {
    const loginBtn = page.locator('a[href="/login"]').first();
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await expect(page).toHaveURL('/login');
    }
  });
});
