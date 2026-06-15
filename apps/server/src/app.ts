import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { sql } from 'drizzle-orm';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import type { AppEnv, Deps } from './lib/context';
import { handleError } from './lib/errors';
import { authMiddleware } from './middleware/auth';
import { createApiRoutes } from './routes';

/** Compose the full HTTP application around injected dependencies. */
export function createApp(deps: Deps) {
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
  // Registered before the authMiddleware below so it is never gated by it.
  app.on(['GET', 'POST'], '/api/auth/*', (c) => deps.auth.handler(c.req.raw));

  // Resolve the session for the rest of the API, then mount the authed routes.
  app.use('/api/*', authMiddleware);
  app.route('/api', createApiRoutes());

  // OpenAPI document + interactive docs.
  app.doc('/api/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'librekanban API', version: '0.1.0' },
  });
  app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }));

  return app;
}

export type App = ReturnType<typeof createApp>;
