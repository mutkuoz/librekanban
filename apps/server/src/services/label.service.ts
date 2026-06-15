import { type Database, cardLabels, cards, labels, newId } from '@librekanban/db';
import type { CreateLabelInput, Label, UpdateLabelInput } from '@librekanban/shared';
import { and, desc, eq } from 'drizzle-orm';
import type { Deps } from '../lib/context';
import { notFound } from '../lib/errors';
import { positionBetween } from './ordering';
import { assertBoardPermission } from './permissions';

const toDTO = (l: typeof labels.$inferSelect): Label => ({
  id: l.id,
  boardId: l.boardId,
  name: l.name,
  color: l.color,
  position: l.position,
});

export async function listLabels(deps: Deps, userId: string, boardId: string): Promise<Label[]> {
  await assertBoardPermission(deps.db, userId, boardId, 'board:read');
  const rows = await deps.db.select().from(labels).where(eq(labels.boardId, boardId));
  return rows.map(toDTO);
}

export async function createLabel(
  deps: Deps,
  userId: string,
  boardId: string,
  input: CreateLabelInput,
): Promise<Label> {
  await assertBoardPermission(deps.db, userId, boardId, 'label:manage');
  const last = await deps.db
    .select({ position: labels.position })
    .from(labels)
    .where(eq(labels.boardId, boardId))
    .orderBy(desc(labels.position))
    .limit(1);
  const [label] = await deps.db
    .insert(labels)
    .values({
      id: newId(),
      boardId,
      name: input.name,
      color: input.color,
      position: positionBetween(last[0]?.position ?? null, null),
    })
    .returning();
  deps.bus.publish({ type: 'board.updated', boardId, actorId: userId });
  return toDTO(label!);
}

async function loadLabel(db: Database, labelId: string) {
  const rows = await db.select().from(labels).where(eq(labels.id, labelId)).limit(1);
  if (!rows[0]) throw notFound('Label');
  return rows[0];
}

export async function updateLabel(
  deps: Deps,
  userId: string,
  labelId: string,
  input: UpdateLabelInput,
): Promise<Label> {
  const existing = await loadLabel(deps.db, labelId);
  await assertBoardPermission(deps.db, userId, existing.boardId, 'label:manage');
  const [label] = await deps.db
    .update(labels)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    })
    .where(eq(labels.id, labelId))
    .returning();
  deps.bus.publish({ type: 'board.updated', boardId: existing.boardId, actorId: userId });
  return toDTO(label!);
}

export async function deleteLabel(deps: Deps, userId: string, labelId: string): Promise<void> {
  const existing = await loadLabel(deps.db, labelId);
  await assertBoardPermission(deps.db, userId, existing.boardId, 'label:manage');
  await deps.db.delete(labels).where(eq(labels.id, labelId));
  deps.bus.publish({ type: 'board.updated', boardId: existing.boardId, actorId: userId });
}

/** Resolve the board a card belongs to (and check it exists). */
async function cardBoardId(db: Database, cardId: string): Promise<string> {
  const rows = await db
    .select({ boardId: cards.boardId })
    .from(cards)
    .where(eq(cards.id, cardId))
    .limit(1);
  if (!rows[0]) throw notFound('Card');
  return rows[0].boardId;
}

export async function addLabelToCard(
  deps: Deps,
  userId: string,
  cardId: string,
  labelId: string,
): Promise<void> {
  const boardId = await cardBoardId(deps.db, cardId);
  await assertBoardPermission(deps.db, userId, boardId, 'card:update');
  await deps.db.insert(cardLabels).values({ cardId, labelId }).onConflictDoNothing();
  deps.bus.publish({ type: 'card.updated', boardId, entityId: cardId, actorId: userId });
}

export async function removeLabelFromCard(
  deps: Deps,
  userId: string,
  cardId: string,
  labelId: string,
): Promise<void> {
  const boardId = await cardBoardId(deps.db, cardId);
  await assertBoardPermission(deps.db, userId, boardId, 'card:update');
  await deps.db
    .delete(cardLabels)
    .where(and(eq(cardLabels.cardId, cardId), eq(cardLabels.labelId, labelId)));
  deps.bus.publish({ type: 'card.updated', boardId, entityId: cardId, actorId: userId });
}
