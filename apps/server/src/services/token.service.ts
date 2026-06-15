import { createHash, randomBytes } from 'node:crypto';
import { type Database, apiTokens, newId, user } from '@librekanban/db';
import type { ApiToken, CreatedToken } from '@librekanban/shared';
import { and, desc, eq } from 'drizzle-orm';
import type { SessionUser } from '../lib/context';

const sha256 = (t: string) => createHash('sha256').update(t).digest('hex');

const toDTO = (r: typeof apiTokens.$inferSelect): ApiToken => ({
  id: r.id,
  name: r.name,
  prefix: r.prefix,
  lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
  expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
  createdAt: r.createdAt.toISOString(),
});

export async function createToken(
  db: Database,
  userId: string,
  name: string,
  expiresInDays?: number,
): Promise<CreatedToken> {
  const token = `lk_${randomBytes(24).toString('base64url')}`;
  const prefix = token.slice(0, 11);
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000) : null;
  const [row] = await db
    .insert(apiTokens)
    .values({ id: newId(), userId, name, tokenHash: sha256(token), prefix, expiresAt })
    .returning();
  return { ...toDTO(row!), token };
}

export async function listTokens(db: Database, userId: string): Promise<ApiToken[]> {
  const rows = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.userId, userId))
    .orderBy(desc(apiTokens.createdAt));
  return rows.map(toDTO);
}

export async function revokeToken(db: Database, userId: string, id: string): Promise<void> {
  await db.delete(apiTokens).where(and(eq(apiTokens.id, id), eq(apiTokens.userId, userId)));
}

/** Resolve a Bearer token to its user (or null). Updates last-used async. */
export async function resolveApiToken(db: Database, token: string): Promise<SessionUser | null> {
  if (!token.startsWith('lk_')) return null;
  const rows = await db
    .select({
      tokenId: apiTokens.id,
      expiresAt: apiTokens.expiresAt,
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(apiTokens)
    .innerJoin(user, eq(user.id, apiTokens.userId))
    .where(eq(apiTokens.tokenHash, sha256(token)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;
  void db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, row.tokenId));
  return { id: row.id, name: row.name, email: row.email, image: row.image };
}
