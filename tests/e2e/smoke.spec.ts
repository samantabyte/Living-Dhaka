import { expect, test } from '@playwright/test';

test('loads a career, diverts to fuel and opens the road map', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /LIVING DHAKA/i })).toBeVisible();
  await page.getByRole('button', { name: /New career/i }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText(/OBJECTIVE/i)).toBeVisible();

  await page.keyboard.press('g');
  await expect(page.getByText(/SERVICE STOP/i)).toBeVisible();
  await expect(page.getByText(/fuel station added/i)).toBeVisible();

  await page.keyboard.press('m');
  await expect(page.getByRole('heading', { name: /Dhaka District Navigation/i })).toBeVisible();
  await expect(page.locator('.map-route')).toBeVisible();
});
