import './load-env';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb } from './client';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required to run migrations');

  const { db, pool } = createDb(url);
  const migrationsFolder = fileURLToPath(new URL('../migrations', import.meta.url));

  console.log('▶ Running migrations…');
  await migrate(db, { migrationsFolder });
  console.log('✓ Migrations complete.');
  await pool.end();
}

main().catch((err) => {
  console.error('✗ Migration failed:', err);
  process.exit(1);
});
