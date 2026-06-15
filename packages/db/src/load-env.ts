import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';

/**
 * Side-effect module: walk up from the current working directory to find the
 * repo-root `.env` and load it. Import this FIRST in CLI entrypoints
 * (migrate/seed) so `process.env` is populated before anything reads it.
 * In production, real environment variables take precedence and this no-ops.
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
