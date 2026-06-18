import './load-env';
import type { Server } from 'node:http';
import { serve } from '@hono/node-server';
import { createAuth } from '@librekanban/auth';
import { MIGRATIONS_DIR, createDb } from '@librekanban/db';
import { type StorageConfig, createStorage } from '@librekanban/storage';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import Redis from 'ioredis';
import { pino } from 'pino';
import { createApp } from './app';
import { type Env, loadEnv } from './env';
import type { Deps } from './lib/context';
import { createRateLimiters } from './middleware/rate-limit';
import { createInProcessBus } from './realtime/event-bus';
import { createPresenceTracker } from './realtime/presence';
import { createRedisBus } from './realtime/redis-bus';
import { createEmailer } from './services/email.service';
import { attachWebSocketServer } from './ws';

const ADVISORY_LOCK_KEY = 727274; // arbitrary, stable across replicas

type SocialProviders = NonNullable<Parameters<typeof createAuth>[0]['socialProviders']>;

function buildSocialProviders(env: Env): SocialProviders {
  const providers: SocialProviders = {};
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.github = { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET };
  }
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.google = { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
  }
  return providers;
}

function buildStorageConfig(env: Env): StorageConfig {
  if (env.STORAGE_BACKEND === 's3') {
    return {
      backend: 's3',
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION ?? 'us-east-1',
      bucket: env.S3_BUCKET ?? '',
      accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
    };
  }
  return { backend: 'local', dir: env.STORAGE_LOCAL_DIR };
}

async function main(): Promise<void> {
  const env = loadEnv();
  const logger = pino({
    level: env.LOG_LEVEL,
    transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  });

  const { db, pool } = createDb(env.DATABASE_URL);

  // Apply migrations on boot under an advisory lock so concurrent replicas
  // never race. Disable with AUTO_MIGRATE=false to run them out-of-band.
  if (env.AUTO_MIGRATE) {
    logger.info('Applying database migrations…');
    await pool.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    try {
      await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    } finally {
      await pool.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
    }
    logger.info('Migrations up to date.');
  }

  const auth = createAuth({
    db,
    secret: env.AUTH_SECRET,
    baseURL: env.PUBLIC_URL,
    trustedOrigins: [env.PUBLIC_URL, 'http://localhost:5173'],
    socialProviders: buildSocialProviders(env),
    oidc:
      env.OIDC_ISSUER && env.OIDC_CLIENT_ID && env.OIDC_CLIENT_SECRET
        ? {
            issuer: env.OIDC_ISSUER,
            clientId: env.OIDC_CLIENT_ID,
            clientSecret: env.OIDC_CLIENT_SECRET,
          }
        : undefined,
  });

  // Redis (optional) powers multi-node realtime fan-out + shared rate limiting.
  if (env.REDIS_URL) logger.info('Redis enabled for realtime + rate limiting');
  const rateLimitRedis = env.REDIS_URL
    ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
    : null;

  const deps: Deps = {
    env,
    db,
    auth,
    bus: env.REDIS_URL ? createRedisBus(env.REDIS_URL) : createInProcessBus(),
    presence: createPresenceTracker(),
    storage: createStorage(buildStorageConfig(env)),
    email: createEmailer(env, logger),
    logger,
  };

  const app = createApp(deps, createRateLimiters(env, rateLimitRedis));
  const server = serve({ fetch: app.fetch, port: env.PORT }, (info) =>
    logger.info(`librekanban listening on http://localhost:${info.port}`),
  ) as unknown as Server;

  attachWebSocketServer(server, deps);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down…');
    server.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
