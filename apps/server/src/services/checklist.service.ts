import { type Database, cards, checklistItems, checklists, newId } from '@librekanban/db';
import type {
  Checklist,
  CreateChecklistInput,
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
} from '@librekanban/shared';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import type { Deps } from '../lib/context';
import { notFound } from '../lib/errors';
import { positionBetween } from './ordering';
import { assertBoardPermission } from './permissions';

async function cardBoardId(db: Database, cardId: string): Promise<string> {
  const rows = await db
    .select({ boardId: cards.boardId })
    .from(cards)
    .where(eq(cards.id, cardId))
    .limit(1);
  if (!rows[0]) throw notFound('Card');
  return rows[0].boardId;
}

/** All checklists for a card, with their items, ready for the card detail panel. */
export async function listChecklists(db: Database, cardId: string): Promise<Checklist[]> {
  const lists = await db
    .select()
    .from(checklists)
    .where(eq(checklists.cardId, cardId))
    .orderBy(asc(checklists.position));
  if (lists.length === 0) return [];
  const items = await db
    .select()
    .from(checklistItems)
    .where(
      inArray(
        checklistItems.checklistId,
        lists.map((l) => l.id),
      ),
    )
    .orderBy(asc(checklistItems.position));
  return lists.map((l) => ({
    id: l.id,
    cardId: l.cardId,
    title: l.title,
    position: l.position,
    items: items
      .filter((it) => it.checklistId === l.id)
      .map((it) => ({
        id: it.id,
        checklistId: it.checklistId,
        content: it.content,
        isDone: it.isDone,
        position: it.position,
      })),
  }));
}

export async function createChecklist(
  deps: Deps,
  userId: string,
  cardId: string,
  input: CreateChecklistInput,
): Promise<void> {
  const boardId = await cardBoardId(deps.db, cardId);
  await assertBoardPermission(deps.db, userId, boardId, 'card:update');
  const last = await deps.db
    .select({ position: checklists.position })
    .from(checklists)
    .where(eq(checklists.cardId, cardId))
    .orderBy(desc(checklists.position))
    .limit(1);
  await deps.db.insert(checklists).values({
    id: newId(),
    cardId,
    title: input.title,
    position: positionBetween(last[0]?.position ?? null, null),
  });
  deps.bus.publish({ type: 'card.updated', boardId, entityId: cardId, actorId: userId });
}

async function checklistCardBoard(
  db: Database,
  checklistId: string,
): Promise<{ cardId: string; boardId: string }> {
  const rows = await db
    .select({ cardId: checklists.cardId })
    .from(checklists)
    .where(eq(checklists.id, checklistId))
    .limit(1);
  if (!rows[0]) throw notFound('Checklist');
  return { cardId: rows[0].cardId, boardId: await cardBoardId(db, rows[0].cardId) };
}

export async function addChecklistItem(
  deps: Deps,
  userId: string,
  checklistId: string,
  input: CreateChecklistItemInput,
): Promise<void> {
  const { cardId, boardId } = await checklistCardBoard(deps.db, checklistId);
  await assertBoardPermission(deps.db, userId, boardId, 'card:update');
  const last = await deps.db
    .select({ position: checklistItems.position })
    .from(checklistItems)
    .where(eq(checklistItems.checklistId, checklistId))
    .orderBy(desc(checklistItems.position))
    .limit(1);
  await deps.db.insert(checklistItems).values({
    id: newId(),
    checklistId,
    content: input.content,
    position: positionBetween(last[0]?.position ?? null, null),
  });
  deps.bus.publish({ type: 'card.updated', boardId, entityId: cardId, actorId: userId });
}

async function itemCardBoard(
  db: Database,
  itemId: string,
): Promise<{ checklistId: string; cardId: string; boardId: string }> {
  const rows = await db
    .select({ checklistId: checklistItems.checklistId })
    .from(checklistItems)
    .where(eq(checklistItems.id, itemId))
    .limit(1);
  if (!rows[0]) throw notFound('Checklist item');
  const cb = await checklistCardBoard(db, rows[0].checklistId);
  return { checklistId: rows[0].checklistId, ...cb };
}

export async function updateChecklistItem(
  deps: Deps,
  userId: string,
  itemId: string,
  input: UpdateChecklistItemInput,
): Promise<void> {
  const { cardId, boardId } = await itemCardBoard(deps.db, itemId);
  await assertBoardPermission(deps.db, userId, boardId, 'card:update');
  await deps.db
    .update(checklistItems)
    .set({
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.isDone !== undefined ? { isDone: input.isDone } : {}),
    })
    .where(eq(checklistItems.id, itemId));
  deps.bus.publish({ type: 'card.updated', boardId, entityId: cardId, actorId: userId });
}

export async function deleteChecklistItem(
  deps: Deps,
  userId: string,
  itemId: string,
): Promise<void> {
  const { cardId, boardId } = await itemCardBoard(deps.db, itemId);
  await assertBoardPermission(deps.db, userId, boardId, 'card:update');
  await deps.db.delete(checklistItems).where(eq(checklistItems.id, itemId));
  deps.bus.publish({ type: 'card.updated', boardId, entityId: cardId, actorId: userId });
}

export async function deleteChecklist(
  deps: Deps,
  userId: string,
  checklistId: string,
): Promise<void> {
  const { cardId, boardId } = await checklistCardBoard(deps.db, checklistId);
  await assertBoardPermission(deps.db, userId, boardId, 'card:update');
  await deps.db.delete(checklists).where(eq(checklists.id, checklistId));
  deps.bus.publish({ type: 'card.updated', boardId, entityId: cardId, actorId: userId });
}
