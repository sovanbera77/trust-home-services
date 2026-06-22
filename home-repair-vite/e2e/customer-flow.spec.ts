import { test, expect } from '@playwright/test';

test.describe('Customer Flow', () => {
  test('customer can sign up and log in', async ({ page }) => {
    await page.goto('/login');

    await page.click('button:has-text("Sign Up")');

    const username = `testcust_${Date.now()}`;
    await page.fill('input[placeholder="Enter username"]', username);
    await page.fill('input[placeholder="Enter full name"]', 'Test Customer');
    await page.fill('input[placeholder="Enter mobile number"]', '9876543210');
    await page.fill('input[type="email"]', `${username}@test.com`);
    await page.fill('input[placeholder="Enter password"]', 'test123');
    await page.fill('input[placeholder="Enter address"]', '123 Test St');
    await page.click('button.btn-primary');

    await expect(page).toHaveURL('/customer');
    await expect(page.locator('h2:has-text("My Requests")')).toBeVisible();
  });

  test('customer can view services catalog', async ({ page }) => {
    await page.goto('/login');
    await page.locator('select').first().selectOption('customer');
    await page.fill('input[placeholder="Enter username"]', 'cust1');
    await page.fill('input[type="password"]', 'cust123');
    await page.click('button.btn-primary');
    await expect(page).toHaveURL('/customer');

    await page.click('button:has-text("Services")');
    await expect(page.locator('h3:has-text("Plumbing")').first()).toBeVisible();
  });
});
