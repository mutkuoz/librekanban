import { type Database, attachments, cards, newId } from '@librekanban/db';
import type { Attachment } from '@librekanban/shared';
import { desc, eq } from 'drizzle-orm';
import type { Deps } from '../lib/context';
import { ApiError, notFound } from '../lib/errors';
import { assertBoardPermission } from './permissions';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

type AttachmentRow = typeof attachments.$inferSelect;

const toDTO = (a: AttachmentRow): Attachment => ({
  id: a.id,
  cardId: a.cardId,
  filename: a.filename,
  contentType: a.contentType,
  sizeBytes: a.sizeBytes,
  uploadedBy: a.uploadedBy,
  createdAt: a.createdAt.toISOString(),
});

async function cardBoardId(db: Database, cardId: string): Promise<string> {
  const rows = await db
    .select({ boardId: cards.boardId })
    .from(cards)
    .where(eq(cards.id, cardId))
    .limit(1);
  if (!rows[0]) throw notFound('Card');
  return rows[0].boardId;
}

export async function listAttachments(db: Database, cardId: string): Promise<Attachment[]> {
  const rows = await db
    .select()
    .from(attachments)
    .where(eq(attachments.cardId, cardId))
    .orderBy(desc(attachments.createdAt));
  return rows.map(toDTO);
}

export async function uploadAttachment(
  deps: Deps,
  userId: string,
  cardId: string,
  file: { filename: string; contentType: string; bytes: Buffer },
): Promise<Attachment> {
  const boardId = await cardBoardId(deps.db, cardId);
  await assertBoardPermission(deps.db, userId, boardId, 'attachment:upload');
  if (file.bytes.length > MAX_BYTES) {
    throw new ApiError(413, 'too_large', 'File exceeds the 25 MB limit');
  }
  const id = newId();
  const storageKey = `attachments/${cardId}/${id}`;
  await deps.storage.put(storageKey, file.bytes, file.contentType);
  const [row] = await deps.db
    .insert(attachments)
    .values({
      id,
      cardId,
      uploadedBy: userId,
      filename: file.filename,
      contentType: file.contentType,
      sizeBytes: file.bytes.length,
      storageKey,
      storageBackend: deps.env.STORAGE_BACKEND,
    })
    .returning();
  deps.bus.publish({ type: 'card.updated', boardId, entityId: cardId, actorId: userId });
  return toDTO(row!);
}

export async function getAttachment(
  deps: Deps,
  userId: string,
  id: string,
): Promise<{ row: AttachmentRow; bytes: Buffer }> {
  const rows = await deps.db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
  const row = rows[0];
  if (!row) throw notFound('Attachment');
  await assertBoardPermission(
    deps.db,
    userId,
    await cardBoardId(deps.db, row.cardId),
    'board:read',
  );
  return { row, bytes: await deps.storage.get(row.storageKey) };
}

export async function deleteAttachment(deps: Deps, userId: string, id: string): Promise<void> {
  const rows = await deps.db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
  const row = rows[0];
  if (!row) throw notFound('Attachment');
  const boardId = await cardBoardId(deps.db, row.cardId);
  await assertBoardPermission(deps.db, userId, boardId, 'card:update');
  await deps.storage.delete(row.storageKey).catch(() => {}); // tolerate a missing blob
  await deps.db.delete(attachments).where(eq(attachments.id, id));
  deps.bus.publish({ type: 'card.updated', boardId, entityId: row.cardId, actorId: userId });
}
