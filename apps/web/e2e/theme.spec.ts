import { type Page, expect, test } from '@playwright/test';

async function signUp(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create an account/i }).click();
  const email = `e2e-theme-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.getByPlaceholder('Name').fill('Theme User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('supersecret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Your boards' })).toBeVisible();
}

test('switch to light theme and pick an accent, persisted across reload', async ({ page }) => {
  await signUp(page);
  await page.getByTitle('Settings').click();
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();

  // Default is dark.
  await expect(page.locator('html')).toHaveClass(/dark/);

  // Switch to light → the .dark class is removed.
  await page.getByRole('button', { name: 'light', exact: true }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);

  // Pick the green accent → --color-brand is overridden (green hue 155).
  await page.getByRole('button', { name: 'Accent green' }).click();
  const brand = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue('--color-brand'),
  );
  expect(brand).toContain('155');

  // Persisted across reload.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});
