import { type Page, expect, test } from '@playwright/test';

async function signUp(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /create an account/i }).click();
  const email = `e2e-team-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.getByPlaceholder('Name').fill('Team Owner');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('supersecret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Your boards' })).toBeVisible();
}

test('owner sees team settings and can create an invitation', async ({ page }) => {
  await signUp(page);

  await page.getByTitle('Settings').click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  // Owner-only team sections render.
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Invitations' })).toBeVisible();

  // The owner appears in the member list as themselves ("(you)" shows in both the
  // inner and wrapping span, so scope to the first match).
  await expect(page.getByText('(you)').first()).toBeVisible();

  // Create an invitation and reveal its link.
  await page.getByPlaceholder('teammate@example.com').fill('teammate@example.com');
  await page.getByRole('button', { name: 'Invite' }).click();

  // The revealed link is the strongest signal the invite was created.
  await expect(page.locator('code', { hasText: '/invite/inv_' })).toBeVisible();
});
