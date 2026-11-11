import { expect, test } from '@playwright/test';
test('loads menu and starts a career',async({page})=>{await page.goto('/');await expect(page.getByRole('heading',{name:/LIVING DHAKA/i})).toBeVisible();await page.getByRole('button',{name:/New career/i}).click();await expect(page.locator('canvas')).toBeVisible();await expect(page.getByText(/Cruise Dhaka|OBJECTIVE/i)).toBeVisible()});
