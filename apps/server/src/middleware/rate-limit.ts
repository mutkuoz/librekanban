import type { Context, MiddlewareHandler } from 'hono';
import { type Store, rateLimiter } from 'hono-rate-limiter';
import type Redis from 'ioredis';
import type { Env } from '../env';
import type { AppEnv } from '../lib/context';

/** Rate-limit key: the authenticated user if present, else the client IP. */
function keyOf(c: Context<AppEnv>): string {
  const user = c.get('user');
  if (user?.id) return user.id;
  const fwd = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
  return fwd || c.req.header('x-real-ip') || 'anon';
}

/** A Redis-backed store so limits hold across nodes. */
function redisStore(redis: Redis, prefix: string): Store<AppEnv> {
  let windowMs = 60_000;
  return {
    init(options) {
      windowMs = options.windowMs;
    },
    async increment(key) {
      const k = `${prefix}:${key}`;
      const totalHits = await redis.incr(k);
      if (totalHits === 1) await redis.pexpire(k, windowMs);
      const ttl = await redis.pttl(k);
      return { totalHits, resetTime: ttl > 0 ? new Date(Date.now() + ttl) : undefined };
    },
    async decrement(key) {
      await redis.decr(`${prefix}:${key}`);
    },
    async resetKey(key) {
      await redis.del(`${prefix}:${key}`);
    },
  };
}

/**
 * Two limiters: strict on auth endpoints (brute-force protection), lenient on
 * the rest of the API. In-memory by default; Redis-backed when a client is
 * provided (multi-node). Standard `RateLimit-*` headers are returned.
 */
export function createRateLimiters(
  env: Env,
  redis: Redis | null,
): { auth: MiddlewareHandler<AppEnv>; api: MiddlewareHandler<AppEnv> } {
  // Strict only in production; dev/test must not self-throttle (e.g. E2E signups).
  const authLimit = env.NODE_ENV === 'production' ? 20 : 100_000;
  const auth = rateLimiter<AppEnv>({
    windowMs: 60_000,
    limit: authLimit,
    standardHeaders: 'draft-7',
    keyGenerator: keyOf,
    store: redis ? redisStore(redis, 'rl:auth') : undefined,
  });
  const api = rateLimiter<AppEnv>({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    keyGenerator: keyOf,
    store: redis ? redisStore(redis, 'rl:api') : undefined,
  });
  return { auth, api };
}
