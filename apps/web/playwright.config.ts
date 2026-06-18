import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const distDir = fileURLToPath(new URL('./dist', import.meta.url));

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    launchOptions: { args: ['--no-sandbox'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Build the SPA, then run the server which also serves it (single origin).
    command: 'pnpm --filter @librekanban/web build && pnpm --filter @librekanban/server start',
    url: `${baseURL}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // 'test' (not 'production') so better-auth's built-in rate limiter stays
      // off — repeated E2E signups from one IP would otherwise be throttled.
      NODE_ENV: 'test',
      PORT: String(PORT),
      PUBLIC_URL: baseURL,
      DATABASE_URL:
        process.env.DATABASE_URL ?? 'postgres://librekanban:librekanban@127.0.0.1:5432/librekanban',
      AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret',
      STATIC_DIR: distDir,
      AUTO_MIGRATE: 'true',
      LOG_LEVEL: 'warn',
      // Exercises the OIDC/SSO button (discovery is never hit — we only assert it renders).
      OIDC_ISSUER: 'https://id.example.com',
      OIDC_CLIENT_ID: 'dummy-client',
      OIDC_CLIENT_SECRET: 'dummy-secret',
      OIDC_NAME: 'Acme',
    },
  },
});
