import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { sql } from 'drizzle-orm';
import type { MiddlewareHandler } from 'hono';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import type { AppEnv, Deps } from './lib/context';
import { handleError } from './lib/errors';
import { authMiddleware } from './middleware/auth';
import { createApiRoutes } from './routes';
import { serveSpa } from './static';

export interface RateLimiters {
  auth: MiddlewareHandler<AppEnv>;
  api: MiddlewareHandler<AppEnv>;
}

/** Compose the full HTTP application around injected dependencies. */
export function createApp(deps: Deps, rateLimiters: RateLimiters) {
  const app = new OpenAPIHono<AppEnv>();

  // Inject deps + a request id into every request, first.
  app.use('*', async (c, next) => {
    c.set('deps', deps);
    await next();
  });
  app.use('*', requestId());
  app.use('*', secureHeaders());
  app.onError(handleError);

  // Liveness / readiness probes.
  app.get('/healthz', (c) => c.json({ status: 'ok' }));
  app.get('/readyz', async (c) => {
    try {
      await deps.db.execute(sql`select 1`);
      return c.json({ status: 'ready' });
    } catch {
      return c.json({ status: 'unavailable' }, 503);
    }
  });

  // better-auth owns sign-up/in/out, OAuth and session endpoints under /api/auth/*.
  // Rate-limit registered first so it covers the auth handler; the handler is
  // registered before authMiddleware so it is never gated by it.
  app.use('/api/auth/*', rateLimiters.auth);
  app.on(['GET', 'POST'], '/api/auth/*', (c) => deps.auth.handler(c.req.raw));

  // Public runtime config the SPA reads before sign-in (which providers exist).
  app.get('/api/config', (c) => {
    const e = c.get('deps').env;
    return c.json({
      oidcEnabled: Boolean(e.OIDC_ISSUER && e.OIDC_CLIENT_ID && e.OIDC_CLIENT_SECRET),
      oidcName: e.OIDC_NAME,
      signupMode: e.SIGNUP_MODE,
    });
  });

  // Resolve the session for the rest of the API, rate-limit it, then mount routes.
  app.use('/api/*', authMiddleware);
  app.use('/api/*', rateLimiters.api);
  app.route('/api', createApiRoutes());

  // OpenAPI document + interactive docs.
  app.doc('/api/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'librekanban API', version: '0.1.0' },
  });
  app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }));

  // In production (single-container), also serve the built SPA.
  if (deps.env.STATIC_DIR) serveSpa(app, deps.env.STATIC_DIR);

  return app;
}

export type App = ReturnType<typeof createApp>;
