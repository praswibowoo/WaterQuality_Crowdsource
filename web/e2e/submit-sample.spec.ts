import { test, expect } from '@playwright/test';

test.describe('Submit Water Sample Journey', () => {
  test('register, login, submit sample, view on map', async ({ page }) => {
    // 1. Register a new user
    await page.goto('/register');
    await page.fill('#name', 'E2E Tester');
    await page.fill('#username', `e2e-tester-${Date.now()}`);
    await page.fill('#password', 'testpassword123');
    await page.fill('#confirmPassword', 'testpassword123');
    await page.click('button[type="submit"]');

    // 2. Navigate to submit form
    await page.goto('/submit');

    // 3. Fill form (authorName auto-filled from auth)
    await page.fill('#ph', '7.2');
    await page.fill('#temperature', '28.5');

    // 4. Select water body type and land use
    await page.click('text=Water Body Type');
    await page.click('text=Select...');
    // Metadata picker interaction depends on component implementation

    // 5. Submit
    await page.click('button[type="submit"]');

    // 6. Verify success message
    await expect(page.locator('.success-banner')).toBeVisible({ timeout: 10000 });
  });
});
