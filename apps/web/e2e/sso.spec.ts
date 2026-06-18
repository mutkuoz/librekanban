import { expect, test } from '@playwright/test';

test('shows the SSO sign-in button when OIDC is configured', async ({ page }) => {
  await page.goto('/');
  // The auth page reads /api/config; the E2E server sets OIDC_NAME=Acme.
  await expect(page.getByRole('button', { name: /Continue with Acme/ })).toBeVisible();
});
