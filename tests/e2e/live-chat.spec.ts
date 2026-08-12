import { test, expect } from '@playwright/test';

test('admin login page is available', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /Temmuz Online Admin/i })).toBeVisible();
});
