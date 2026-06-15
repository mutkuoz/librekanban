import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { AppEnv, SessionUser } from '../lib/context';
import { unauthorized } from '../lib/errors';

/** Resolve the session (if any) from cookies/headers and stash the user. */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const { auth } = c.get('deps');
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set('user', session?.user ?? null);
  await next();
});

/** Reject the request unless authenticated. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get('user')) throw unauthorized();
  await next();
});

/** Get the authenticated user inside a handler (throws if missing). */
export function currentUser(c: Context<AppEnv>): SessionUser {
  const user = c.get('user');
  if (!user) throw unauthorized();
  return user;
}
