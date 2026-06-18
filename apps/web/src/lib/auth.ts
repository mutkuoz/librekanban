/**
 * Thin wrappers over better-auth's REST endpoints (mounted at /api/auth).
 * Cookies are httpOnly and sent automatically on the same origin.
 */
async function authPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/auth${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { message?: string } | null)?.message ?? 'Authentication failed');
  }
  return data as T;
}

export const signUp = (name: string, email: string, password: string) =>
  authPost('/sign-up/email', { name, email, password });

/** Returns `{ twoFactor: true }` when the account needs a second factor. */
export async function signIn(email: string, password: string): Promise<{ twoFactor: boolean }> {
  const data = await authPost<{ twoFactorRedirect?: boolean }>('/sign-in/email', {
    email,
    password,
  });
  return { twoFactor: Boolean(data?.twoFactorRedirect) };
}

export const signOut = () => authPost('/sign-out', {});

export interface TwoFactorSetup {
  totpURI: string;
  backupCodes: string[];
}

/** Begin TOTP enrollment — returns the otpauth URI + one-time backup codes. */
export const enable2FA = (password: string) =>
  authPost<TwoFactorSetup>('/two-factor/enable', { password });

/** Confirm a TOTP code (completes enrollment, or satisfies a sign-in challenge). */
export const verifyTotp = (code: string) => authPost('/two-factor/verify-totp', { code });

export const disable2FA = (password: string) => authPost('/two-factor/disable', { password });

/** Kick off a social OAuth flow (redirects the browser). */
export function signInWith(provider: 'github' | 'google'): void {
  const callbackURL = window.location.origin;
  fetch('/api/auth/sign-in/social', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ provider, callbackURL }),
  })
    .then((r) => r.json())
    .then((d: { url?: string }) => {
      if (d.url) window.location.href = d.url;
    })
    .catch(() => {});
}

/** Kick off the generic OIDC / SSO flow (redirects the browser). */
export function signInWithOIDC(): void {
  const callbackURL = window.location.origin;
  fetch('/api/auth/sign-in/oauth2', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ providerId: 'oidc', callbackURL }),
  })
    .then((r) => r.json())
    .then((d: { url?: string }) => {
      if (d.url) window.location.href = d.url;
    })
    .catch(() => {});
}
