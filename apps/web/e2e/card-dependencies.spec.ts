import { type Page, expect, test } from '@playwright/test';

async function signUp(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create an account/i }).click();
  const email = `e2e-dep-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.getByPlaceholder('Name').fill('Dep User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('supersecret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Your boards' })).toBeVisible();
}

test('link a card as blocked by another, and see the blocked chip', async ({ page }) => {
  await signUp(page);
  await page.getByRole('link', { name: /Welcome to librekanban/i }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to librekanban' })).toBeVisible();

  // Open card #1 and add card #2 as a blocker via the Dependencies picker.
  await page.getByTestId('card').filter({ hasText: 'Welcome! Drag me' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  const depSection = dialog.locator('section', { has: page.getByText('Dependencies') });
  // Options are [placeholder, the only other card]; pick the first real one.
  await depSection.locator('select').selectOption({ index: 1 });

  // The "Blocked by" list now lists the other card.
  await expect(depSection.getByText('Blocked by')).toBeVisible();
  await expect(depSection.getByText(/Click a card to open its details/)).toBeVisible();

  // Close the modal; the blocked card shows the blocked chip on the board.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByTitle('Blocked by other cards')).toBeVisible();
});
