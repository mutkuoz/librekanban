import { type Page, expect, test } from '@playwright/test';

async function signUp(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create an account/i }).click();
  const email = `e2e-filter-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.getByPlaceholder('Name').fill('Filter User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('supersecret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to librekanban' })).toBeVisible();
}

const column = (page: Page, name: string) =>
  page.locator(`[data-testid="board-column"][data-column-name="${name}"]`);

test('filter the board by priority, then clear', async ({ page }) => {
  await signUp(page);
  await page.getByRole('link', { name: /Welcome to librekanban/i }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to librekanban' })).toBeVisible();

  // Add a card and mark it urgent.
  const todo = column(page, 'To Do');
  await todo.getByRole('button', { name: /add card/i }).click();
  await todo.getByPlaceholder('Card title…').fill('Urgent task');
  await todo.getByRole('button', { name: 'Add', exact: true }).click();

  await page.getByTestId('card').filter({ hasText: 'Urgent task' }).click();
  const dialog = page.getByRole('dialog');
  await dialog
    .locator('section', { has: page.getByText('Priority') })
    .locator('select')
    .selectOption('urgent');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  // Open the Filters panel and constrain to urgent only. (The open panel draws a
  // transparent full-screen overlay to catch outside clicks; we drive the panel's
  // own controls, which sit above it, and assert card visibility through it.)
  await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByRole('button', { name: 'urgent', exact: true }).click();

  await expect(page.getByTestId('card').filter({ hasText: 'Urgent task' })).toBeVisible();
  await expect(page.getByTestId('card').filter({ hasText: 'Welcome! Drag me' })).toHaveCount(0);

  // Clear restores the hidden cards.
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByTestId('card').filter({ hasText: 'Welcome! Drag me' })).toBeVisible();
});
