import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { AppEnv, SessionUser } from '../lib/context';
import { unauthorized } from '../lib/errors';
import { resolveApiToken } from '../services/token.service';

/**
 * Resolve the caller from a session cookie (first-party app) or a Bearer API
 * token (public API), and stash the user on the context.
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const { auth, db } = c.get('deps');
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (session?.user) {
    c.set('user', {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    });
  } else {
    const authz = c.req.header('authorization');
    const token = authz?.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : null;
    c.set('user', token ? await resolveApiToken(db, token) : null);
  }
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
