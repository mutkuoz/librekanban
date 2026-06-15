import { type Database, account, session, user, verification } from '@librekanban/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

type SocialProviders = NonNullable<Parameters<typeof betterAuth>[0]['socialProviders']>;

export interface AuthOptions {
  db: Database;
  /** Long random secret (AUTH_SECRET). */
  secret: string;
  /** Public base URL the app is served from. */
  baseURL: string;
  /** Origins allowed to call the auth API (dev Vite server, prod URL, …). */
  trustedOrigins?: string[];
  /** Pre-built social provider config (only enabled providers passed in). */
  socialProviders?: SocialProviders;
}

/**
 * Construct the better-auth instance. This factory is the ONE place the app
 * touches better-auth — everything else goes through `auth.handler` (mounted
 * at /api/auth/*) and `auth.api.getSession(...)`. Swapping the auth provider
 * later means rewriting this file, not the call sites.
 */
export function createAuth(opts: AuthOptions) {
  return betterAuth({
    secret: opts.secret,
    baseURL: opts.baseURL,
    trustedOrigins: opts.trustedOrigins ?? [opts.baseURL],
    database: drizzleAdapter(opts.db, {
      provider: 'pg',
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      // M3 will wire real email; for now allow sign-in immediately.
      requireEmailVerification: false,
    },
    socialProviders: opts.socialProviders ?? {},
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh once per day
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Resolved session shape (user + session) or null. */
export type AuthSession = Awaited<ReturnType<Auth['api']['getSession']>>;
