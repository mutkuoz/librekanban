import { type Page, expect, test } from '@playwright/test';

async function signUp(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create an account/i }).click();
  const email = `e2e-collapse-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.getByPlaceholder('Name').fill('Collapse User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('supersecret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to librekanban' })).toBeVisible();
}

test('desktop: collapse and expand the sidebar', async ({ page }) => {
  await signUp(page);

  const boardLink = page.getByRole('link', { name: /Welcome to librekanban/i });
  await expect(boardLink).toBeVisible();

  // Collapse → the rail hides and the expand (menu) button appears.
  await page.getByTitle('Collapse sidebar').click();
  await expect(boardLink).toBeHidden();
  const menu = page.getByRole('button', { name: 'Menu' });
  await expect(menu).toBeVisible();

  // Expand again.
  await menu.click();
  await expect(boardLink).toBeVisible();
});
