import { type Page, expect, test } from '@playwright/test';

async function signUp(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create an account/i }).click();
  const email = `e2e-i18n-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.getByPlaceholder('Name').fill('Lang User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('supersecret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Your boards' })).toBeVisible();
}

test('switch the interface to Turkish, persisted across reload', async ({ page }) => {
  await signUp(page);
  await page.getByTitle('Settings').click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  // Switch language to Turkish from the Appearance section.
  await page.getByRole('button', { name: 'Türkçe' }).click();

  // Chrome is now Turkish.
  await expect(page.getByRole('heading', { name: 'Ayarlar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Görünüm' })).toBeVisible();

  // Boards list is translated too.
  await page.getByRole('link', { name: '← Panolar' }).click();
  await expect(page.getByRole('heading', { name: 'Panolarınız' })).toBeVisible();

  // The choice persists across a reload.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Panolarınız' })).toBeVisible();
});
