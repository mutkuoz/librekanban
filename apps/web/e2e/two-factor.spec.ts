import { type Page, expect, test } from '@playwright/test';

async function signUp(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create an account/i }).click();
  const email = `e2e-2fa-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.getByPlaceholder('Name').fill('TwoFA User');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('supersecret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to librekanban' })).toBeVisible();
}

test('enable 2FA from settings reveals the TOTP secret and backup codes', async ({ page }) => {
  await signUp(page);
  await page.getByTitle('Settings').click();

  const security = page.locator('section', {
    has: page.getByRole('heading', { name: 'Security' }),
  });
  await expect(security).toBeVisible();

  await security.getByPlaceholder('Current password').fill('supersecret123');
  await security.getByRole('button', { name: 'Enable' }).click();

  // The enrollment panel shows the otpauth URI, backup codes, and a code field.
  await expect(security.locator('code', { hasText: 'otpauth://' })).toBeVisible();
  await expect(security.getByText(/Backup codes/)).toBeVisible();
  await expect(security.getByPlaceholder('000000')).toBeVisible();
});
