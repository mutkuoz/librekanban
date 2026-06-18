import { type Page, expect, test } from '@playwright/test';

async function signUp(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create an account/i }).click();
  const email = `e2e-drag-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.getByPlaceholder('Name').fill('Drag User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('supersecret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to librekanban' })).toBeVisible();
}

const column = (page: Page, name: string) =>
  page.locator(`[data-testid="board-column"][data-column-name="${name}"]`);

test('drop a card into the empty middle column near its top', async ({ page }) => {
  await signUp(page);
  await expect(page.getByTestId('board-column')).toHaveCount(3);

  const inProgress = column(page, 'In Progress');
  const card = page.getByTestId('card').filter({ hasText: 'Welcome! Drag me' });

  const from = (await card.boundingBox())!;
  const to = (await inProgress.boundingBox())!;

  // Drop near the TOP of the (empty) middle column — the spot where a
  // corner-based hit-test would wrongly grab an adjacent To Do card.
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + 40, { steps: 20 });
  await page.mouse.move(to.x + to.width / 2, to.y + 36, { steps: 5 });
  await page.mouse.up();

  await expect(
    inProgress.getByTestId('card').filter({ hasText: 'Welcome! Drag me' }),
  ).toBeVisible();
  await expect(
    column(page, 'To Do').getByTestId('card').filter({ hasText: 'Welcome! Drag me' }),
  ).toHaveCount(0);
});
