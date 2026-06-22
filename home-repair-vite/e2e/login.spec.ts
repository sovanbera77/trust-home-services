import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('shows login page and allows admin login', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1:has-text("Trust Home Services")')).toBeVisible();

    await page.locator('select').first().selectOption('admin');
    await expect(page.locator('input[readonly]')).toHaveValue('admin');

    await page.fill('input[type="password"]', 'admin123');
    await page.click('button.btn-primary');

    await expect(page).toHaveURL('/admin');
    await expect(page.locator('button:has-text("Dockets")').first()).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('select').first().selectOption('admin');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button.btn-primary');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('can toggle to WhatsApp OTP mode', async ({ page }) => {
    await page.goto('/login');
    await page.click('button:has-text("Use WhatsApp OTP")');
    await expect(page.locator('h3:has-text("Login with WhatsApp")')).toBeVisible();
    await page.click('button:has-text("Use password login")');
    await expect(page.locator('button:has-text("Login")').first()).toBeVisible();
  });

  test('customer can login with demo credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('select').first().selectOption('customer');
    await page.fill('input[placeholder="Enter username"]', 'cust1');
    await page.fill('input[type="password"]', 'cust123');
    await page.click('button.btn-primary');

    await expect(page).toHaveURL('/customer');
  });

  test('employee can login with demo credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('select').first().selectOption('employee');

    const empSelect = page.locator('select').nth(1);
    await expect(empSelect).toBeVisible();
    await empSelect.selectOption('emp1');

    await page.fill('input[type="password"]', 'emp123');
    await page.click('button.btn-primary');

    await expect(page).toHaveURL('/employee');
  });
});
