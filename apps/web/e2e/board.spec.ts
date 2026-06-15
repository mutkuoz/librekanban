import { type Page, expect, test } from '@playwright/test';

async function signUp(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create an account/i }).click();
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.getByPlaceholder('Name').fill('E2E User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('supersecret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Your boards' })).toBeVisible();
}

async function openWelcomeBoard(page: Page): Promise<void> {
  await page.getByRole('link', { name: /Welcome to librekanban/i }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to librekanban' })).toBeVisible();
  await expect(page.getByTestId('board-column')).toHaveCount(3);
}

const column = (page: Page, name: string) =>
  page.locator(`[data-testid="board-column"][data-column-name="${name}"]`);

test('sign up, see the seeded board, and add a card', async ({ page }) => {
  await signUp(page);
  await openWelcomeBoard(page);

  await expect(page.getByText('Welcome! Drag me to another column')).toBeVisible();

  const todo = column(page, 'To Do');
  await todo.getByRole('button', { name: /add card/i }).click();
  await todo.getByPlaceholder('Card title…').fill('My E2E card');
  await todo.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(todo.getByTestId('card').filter({ hasText: 'My E2E card' })).toBeVisible();
});

test('drag a card from To Do to In Progress', async ({ page }) => {
  await signUp(page);
  await openWelcomeBoard(page);

  const todo = column(page, 'To Do');
  const inProgress = column(page, 'In Progress');
  const card = page.getByTestId('card').filter({ hasText: 'Welcome! Drag me' });

  await expect(todo.getByTestId('card').filter({ hasText: 'Welcome! Drag me' })).toBeVisible();

  const from = (await card.boundingBox())!;
  const to = (await inProgress.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // Exceed dnd-kit's 5px activation distance, then move into the target column.
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + 120, { steps: 15 });
  await page.mouse.move(to.x + to.width / 2, to.y + 130, { steps: 5 });
  await page.mouse.up();

  await expect(
    inProgress.getByTestId('card').filter({ hasText: 'Welcome! Drag me' }),
  ).toBeVisible();
  await expect(todo.getByTestId('card').filter({ hasText: 'Welcome! Drag me' })).toHaveCount(0);
});

test('open a card and create a label', async ({ page }) => {
  await signUp(page);
  await openWelcomeBoard(page);

  await page.getByTestId('card').filter({ hasText: 'Click a card' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByPlaceholder('+ new label').fill('Bug');
  await dialog.getByPlaceholder('+ new label').press('Enter');
  await expect(dialog.getByRole('button', { name: 'Bug', exact: true })).toBeVisible();
});
