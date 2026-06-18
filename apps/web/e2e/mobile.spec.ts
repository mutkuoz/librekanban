import { type Page, expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

async function signUp(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create an account/i }).click();
  const email = `e2e-mobile-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.getByPlaceholder('Name').fill('Mobile User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('supersecret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to librekanban' })).toBeVisible();
}

test('mobile: the sidebar is a drawer toggled by the menu button', async ({ page }) => {
  await signUp(page);

  // The hamburger is shown on mobile; the sidebar board link is off-screen.
  const menu = page.getByRole('button', { name: 'Menu' });
  await expect(menu).toBeVisible();
  const boardLink = page.getByRole('link', { name: /Welcome to librekanban/i });
  await expect(boardLink).not.toBeInViewport();

  // Open the drawer → the board link slides into view.
  await menu.click();
  await expect(boardLink).toBeInViewport();

  // Tapping a board navigates and closes the drawer.
  await boardLink.click();
  await expect(boardLink).not.toBeInViewport();
  await expect(page.getByRole('heading', { name: 'Welcome to librekanban' })).toBeVisible();
});
