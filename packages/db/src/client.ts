import { type NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type Schema = typeof schema;
export type Database = NodePgDatabase<Schema>;

/**
 * Build a Drizzle client + connection pool from a connection string. The
 * server (composition root) creates this once and injects it; tests create
 * an isolated instance per run. No module-level singleton — keeps things
 * testable and free of import-order/env surprises.
 */
export function createDb(connectionString: string): { db: Database; pool: Pool } {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
