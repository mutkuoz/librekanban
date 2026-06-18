import { type Database, account, session, user, verification } from '@librekanban/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { genericOAuth } from 'better-auth/plugins';

type SocialProviders = NonNullable<Parameters<typeof betterAuth>[0]['socialProviders']>;

/** Generic OIDC (SSO) provider config, when configured via env. */
export interface OidcOptions {
  issuer: string;
  clientId: string;
  clientSecret: string;
}

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
  /** Optional generic OIDC provider (registered with providerId `oidc`). */
  oidc?: OidcOptions;
}

/**
 * Construct the better-auth instance. This factory is the ONE place the app
 * touches better-auth — everything else goes through `auth.handler` (mounted
 * at /api/auth/*) and `auth.api.getSession(...)`. Swapping the auth provider
 * later means rewriting this file, not the call sites.
 */
export function createAuth(opts: AuthOptions) {
  const plugins = [];
  if (opts.oidc) {
    plugins.push(
      genericOAuth({
        config: [
          {
            providerId: 'oidc',
            discoveryUrl: `${opts.oidc.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`,
            clientId: opts.oidc.clientId,
            clientSecret: opts.oidc.clientSecret,
            scopes: ['openid', 'profile', 'email'],
          },
        ],
      }),
    );
  }

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
    plugins,
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh once per day
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Resolved session shape (user + session) or null. */
export type AuthSession = Awaited<ReturnType<Auth['api']['getSession']>>;
