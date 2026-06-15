import {
  type Database,
  cards,
  customFieldDefinitions,
  customFieldValues,
  newId,
} from '@librekanban/db';
import type {
  CreateCustomFieldInput,
  CustomField,
  UpdateCustomFieldInput,
} from '@librekanban/shared';
import { and, asc, desc, eq } from 'drizzle-orm';
import type { Deps } from '../lib/context';
import { notFound } from '../lib/errors';
import { positionBetween } from './ordering';
import { assertBoardPermission } from './permissions';

type DefRow = typeof customFieldDefinitions.$inferSelect;

const toDTO = (d: DefRow): CustomField => ({
  id: d.id,
  boardId: d.boardId,
  name: d.name,
  type: d.type,
  config: (d.config ?? {}) as CustomField['config'],
  position: d.position,
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

export async function listCustomFields(db: Database, boardId: string): Promise<CustomField[]> {
  const rows = await db
    .select()
    .from(customFieldDefinitions)
    .where(
      and(eq(customFieldDefinitions.boardId, boardId), eq(customFieldDefinitions.isActive, true)),
    )
    .orderBy(asc(customFieldDefinitions.position));
  return rows.map(toDTO);
}

export async function createCustomField(
  deps: Deps,
  userId: string,
  boardId: string,
  input: CreateCustomFieldInput,
): Promise<CustomField> {
  const { board } = await assertBoardPermission(deps.db, userId, boardId, 'customField:manage');
  const last = await deps.db
    .select({ position: customFieldDefinitions.position })
    .from(customFieldDefinitions)
    .where(eq(customFieldDefinitions.boardId, boardId))
    .orderBy(desc(customFieldDefinitions.position))
    .limit(1);
  const [row] = await deps.db
    .insert(customFieldDefinitions)
    .values({
      id: newId(),
      workspaceId: board.workspaceId,
      boardId,
      name: input.name,
      type: input.type,
      config: input.config ?? {},
      position: positionBetween(last[0]?.position ?? null, null),
    })
    .returning();
  deps.bus.publish({ type: 'board.updated', boardId, actorId: userId });
  return toDTO(row!);
}

async function loadField(db: Database, fieldId: string): Promise<DefRow> {
  const rows = await db
    .select()
    .from(customFieldDefinitions)
    .where(eq(customFieldDefinitions.id, fieldId))
    .limit(1);
  if (!rows[0] || !rows[0].boardId) throw notFound('Custom field');
  return rows[0];
}

export async function updateCustomField(
  deps: Deps,
  userId: string,
  fieldId: string,
  input: UpdateCustomFieldInput,
): Promise<CustomField> {
  const existing = await loadField(deps.db, fieldId);
  await assertBoardPermission(deps.db, userId, existing.boardId!, 'customField:manage');
  const [row] = await deps.db
    .update(customFieldDefinitions)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.config !== undefined ? { config: input.config } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    })
    .where(eq(customFieldDefinitions.id, fieldId))
    .returning();
  deps.bus.publish({ type: 'board.updated', boardId: existing.boardId!, actorId: userId });
  return toDTO(row!);
}

export async function deleteCustomField(
  deps: Deps,
  userId: string,
  fieldId: string,
): Promise<void> {
  const existing = await loadField(deps.db, fieldId);
  await assertBoardPermission(deps.db, userId, existing.boardId!, 'customField:manage');
  await deps.db.delete(customFieldDefinitions).where(eq(customFieldDefinitions.id, fieldId));
  deps.bus.publish({ type: 'board.updated', boardId: existing.boardId!, actorId: userId });
}

export async function setCustomFieldValue(
  deps: Deps,
  userId: string,
  cardId: string,
  fieldId: string,
  value: unknown,
): Promise<void> {
  const boardId = await cardBoardId(deps.db, cardId);
  await assertBoardPermission(deps.db, userId, boardId, 'card:update');
  if (value === null || value === undefined || value === '') {
    await deps.db
      .delete(customFieldValues)
      .where(and(eq(customFieldValues.fieldId, fieldId), eq(customFieldValues.cardId, cardId)));
  } else {
    await deps.db
      .insert(customFieldValues)
      .values({ id: newId(), fieldId, cardId, value })
      .onConflictDoUpdate({
        target: [customFieldValues.fieldId, customFieldValues.cardId],
        set: { value },
      });
  }
  deps.bus.publish({ type: 'card.updated', boardId, entityId: cardId, actorId: userId });
}

/** Values for a single card as a { fieldId: value } map. */
export async function listCardCustomValues(
  db: Database,
  cardId: string,
): Promise<Record<string, unknown>> {
  const rows = await db
    .select({ fieldId: customFieldValues.fieldId, value: customFieldValues.value })
    .from(customFieldValues)
    .where(eq(customFieldValues.cardId, cardId));
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.fieldId] = r.value;
  return out;
}
