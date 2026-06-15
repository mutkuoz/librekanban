import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';

/**
 * Side-effect module: load the repo-root `.env` (walking up from cwd) before
 * anything reads `process.env`. Must be the FIRST import in `index.ts`.
 * Real environment variables (e.g. from docker-compose) always take precedence.
 */
let dir = process.cwd();
for (let i = 0; i < 10; i++) {
  const envPath = join(dir, '.env');
  if (existsSync(envPath)) {
    config({ path: envPath });
    break;
  }
  const parent = dirname(dir);
  if (parent === dir) break;
  dir = parent;
}
