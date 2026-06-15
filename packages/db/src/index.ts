import { fileURLToPath } from 'node:url';

export * from './schema';
export { createDb, type Database, type Schema } from './client';
export { newId } from './ids';

/**
 * Absolute path to the generated SQL migrations. Resolved from source layout
 * (the app runs via tsx from source, so this is stable in dev and prod).
 */
export const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations', import.meta.url));
