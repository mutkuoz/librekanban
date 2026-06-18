import { type Page, expect, test } from '@playwright/test';

async function signUp(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create an account/i }).click();
  const email = `e2e-view-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.getByPlaceholder('Name').fill('View User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('supersecret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Your boards' })).toBeVisible();
}

const welcomeCard = (page: Page) =>
  page.getByTestId('card').filter({ hasText: 'Welcome! Drag me' });

test('save a filter as a view, then re-apply it after reload', async ({ page }) => {
  await signUp(page);
  await page.getByRole('link', { name: /Welcome to librekanban/i }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to librekanban' })).toBeVisible();
  await expect(welcomeCard(page)).toBeVisible();

  // Apply an urgent-only filter (no seeded card is urgent → hides them all).
  await page.getByRole('button', { name: 'Filters' }).click();
  await page.getByRole('button', { name: 'urgent', exact: true }).click();
  await page.getByRole('button', { name: 'Close filters' }).click();
  await expect(welcomeCard(page)).toHaveCount(0);

  // Save it as a named view.
  page.once('dialog', (d) => d.accept('Urgent only'));
  await page.getByRole('button', { name: 'Views' }).click();
  await page.getByRole('button', { name: /Save current view/ }).click();
  await expect(page.getByRole('button', { name: 'Urgent only' })).toBeVisible();
  await page.getByRole('button', { name: 'Close views' }).click();

  // Reload (filter state is lost) — the seeded card returns.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome to librekanban' })).toBeVisible();
  await expect(welcomeCard(page)).toBeVisible();

  // Re-apply the persisted view; the urgent filter takes effect again.
  await page.getByRole('button', { name: 'Views' }).click();
  await page.getByRole('button', { name: 'Urgent only' }).click();
  await expect(welcomeCard(page)).toHaveCount(0);
});
