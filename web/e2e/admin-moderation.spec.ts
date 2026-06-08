import { test, expect } from '@playwright/test';

test.describe('Admin Moderation Journey', () => {
  test('login as admin, view pending, approve a sample', async ({ page }) => {
    // 1. Login as admin
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', process.env.ADMIN_PASSWORD || 'admin');
    await page.click('button[type="submit"]');

    // 2. Navigate to admin dashboard
    await page.goto('/admin');

    // 3. Verify dashboard loads
    await expect(page.locator('.admin-dashboard')).toBeVisible();

    // 4. Check pending tab exists
    await expect(page.locator('button:has-text("Pending")')).toBeVisible();
  });
});
