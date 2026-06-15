/**
 * Thin wrappers over better-auth's REST endpoints (mounted at /api/auth).
 * Cookies are httpOnly and sent automatically on the same origin.
 */
async function authPost(path: string, body: unknown): Promise<void> {
  const res = await fetch(`/api/auth${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? 'Authentication failed');
  }
}

export const signUp = (name: string, email: string, password: string) =>
  authPost('/sign-up/email', { name, email, password });

export const signIn = (email: string, password: string) =>
  authPost('/sign-in/email', { email, password });

export const signOut = () => authPost('/sign-out', {});

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
