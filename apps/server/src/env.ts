import { SIGNUP_MODES, STORAGE_BACKENDS } from '@librekanban/shared';
import { z } from 'zod';

/** Parse "true"/"1" as true, "false"/"0" as false, with a typed default. */
const boolFromEnv = (def: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? def : v === 'true' || v === '1'));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters'),
  SIGNUP_MODE: z.enum(SIGNUP_MODES).default('open'),

  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTO_MIGRATE: boolFromEnv(true),

  REDIS_URL: z.string().optional(),

  // Absolute path to the built web SPA. When set, the server also serves the
  // frontend (single-container deploy). Unset in dev (Vite serves the SPA).
  STATIC_DIR: z.string().optional(),

  STORAGE_BACKEND: z.enum(STORAGE_BACKENDS).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./data/uploads'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().default(300),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate `process.env` once at boot. On failure, print every problem and
 * exit — fail fast with a readable message rather than crash mysteriously later.
 */
export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.error(`✗ Invalid environment configuration:\n${issues}`);
    throw new Error('Invalid environment configuration');
  }
  return parsed.data;
}
