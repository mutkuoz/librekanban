import { type Page, expect, test } from '@playwright/test';

async function signUp(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create an account/i }).click();
  const email = `e2e-col-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.getByPlaceholder('Name').fill('Col User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('supersecret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Your boards' })).toBeVisible();
}

const column = (page: Page, name: string) =>
  page.locator(`[data-testid="board-column"][data-column-name="${name}"]`);

test('reorder columns by dragging the header', async ({ page }) => {
  await signUp(page);
  await page.getByRole('link', { name: /Welcome to librekanban/i }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to librekanban' })).toBeVisible();
  await expect(page.getByTestId('board-column')).toHaveCount(3);

  // Initially: To Do, In Progress, Done.
  await expect(page.getByTestId('board-column').first()).toHaveAttribute(
    'data-column-name',
    'To Do',
  );

  const from = (await column(page, 'To Do').boundingBox())!;
  const to = (await column(page, 'In Progress').boundingBox())!;

  // Grab the To Do column by its header and drop it past In Progress.
  await page.mouse.move(from.x + from.width / 2, from.y + 14);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + 14, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + 14, { steps: 15 });
  await page.mouse.move(to.x + to.width - 8, to.y + 14, { steps: 5 });
  await page.mouse.up();

  // To Do should no longer be the first column.
  await expect(page.getByTestId('board-column').first()).toHaveAttribute(
    'data-column-name',
    'In Progress',
  );
});
