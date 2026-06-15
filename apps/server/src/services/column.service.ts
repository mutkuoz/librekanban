import { type Database, columns, newId } from '@librekanban/db';
import type {
  Column,
  CreateColumnInput,
  MoveColumnInput,
  UpdateColumnInput,
} from '@librekanban/shared';
import { and, asc, desc, eq, gt } from 'drizzle-orm';
import type { Deps } from '../lib/context';
import { notFound } from '../lib/errors';
import { toColumnDTO } from '../lib/serialize';
import { recordActivity } from './activity';
import { positionBetween } from './ordering';
import { assertBoardPermission } from './permissions';

/** Position a new column after `afterColumnId` (or at the end of the board). */
async function positionForNewColumn(
  db: Database,
  boardId: string,
  afterColumnId: string | null,
): Promise<string> {
  if (!afterColumnId) {
    const last = await db
      .select({ position: columns.position })
      .from(columns)
      .where(eq(columns.boardId, boardId))
      .orderBy(desc(columns.position))
      .limit(1);
    return positionBetween(last[0]?.position ?? null, null);
  }
  const afterRows = await db
    .select({ position: columns.position })
    .from(columns)
    .where(eq(columns.id, afterColumnId))
    .limit(1);
  const afterPos = afterRows[0]?.position ?? null;
  const nextRows = afterPos
    ? await db
        .select({ position: columns.position })
        .from(columns)
        .where(and(eq(columns.boardId, boardId), gt(columns.position, afterPos)))
        .orderBy(asc(columns.position))
        .limit(1)
    : [];
  return positionBetween(afterPos, nextRows[0]?.position ?? null);
}

async function loadColumn(db: Database, columnId: string) {
  const rows = await db.select().from(columns).where(eq(columns.id, columnId)).limit(1);
  if (!rows[0]) throw notFound('Column');
  return rows[0];
}

export async function createColumn(
  deps: Deps,
  userId: string,
  boardId: string,
  input: CreateColumnInput,
): Promise<Column> {
  const { board } = await assertBoardPermission(deps.db, userId, boardId, 'column:manage');
  const position = await positionForNewColumn(deps.db, boardId, input.afterColumnId ?? null);
  const [col] = await deps.db
    .insert(columns)
    .values({
      id: newId(),
      boardId,
      name: input.name,
      wipLimit: input.wipLimit ?? null,
      color: input.color ?? null,
      isDoneColumn: input.isDoneColumn ?? false,
      position,
    })
    .returning();
  await recordActivity(deps.db, {
    workspaceId: board.workspaceId,
    boardId,
    actorId: userId,
    verb: 'column.created',
    data: { name: input.name },
  });
  deps.bus.publish({ type: 'column.updated', boardId, entityId: col!.id, actorId: userId });
  return toColumnDTO(col!);
}

export async function updateColumn(
  deps: Deps,
  userId: string,
  columnId: string,
  input: UpdateColumnInput,
): Promise<Column> {
  const existing = await loadColumn(deps.db, columnId);
  const { board } = await assertBoardPermission(deps.db, userId, existing.boardId, 'column:manage');
  const [col] = await deps.db
    .update(columns)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.wipLimit !== undefined ? { wipLimit: input.wipLimit } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.isDoneColumn !== undefined ? { isDoneColumn: input.isDoneColumn } : {}),
      updatedAt: new Date(),
    })
    .where(eq(columns.id, columnId))
    .returning();
  await recordActivity(deps.db, {
    workspaceId: board.workspaceId,
    boardId: existing.boardId,
    actorId: userId,
    verb: 'column.updated',
  });
  deps.bus.publish({
    type: 'column.updated',
    boardId: existing.boardId,
    entityId: columnId,
    actorId: userId,
  });
  return toColumnDTO(col!);
}

export async function moveColumn(
  deps: Deps,
  userId: string,
  columnId: string,
  input: MoveColumnInput,
): Promise<Column> {
  const existing = await loadColumn(deps.db, columnId);
  await assertBoardPermission(deps.db, userId, existing.boardId, 'column:manage');

  const neighbourPos = async (id: string | null): Promise<string | null> => {
    if (!id) return null;
    const rows = await deps.db
      .select({ position: columns.position })
      .from(columns)
      .where(eq(columns.id, id))
      .limit(1);
    return rows[0]?.position ?? null;
  };
  const [prevPos, nextPos] = await Promise.all([
    neighbourPos(input.prevColumnId),
    neighbourPos(input.nextColumnId),
  ]);

  const [col] = await deps.db
    .update(columns)
    .set({ position: positionBetween(prevPos, nextPos), updatedAt: new Date() })
    .where(eq(columns.id, columnId))
    .returning();
  deps.bus.publish({
    type: 'column.updated',
    boardId: existing.boardId,
    entityId: columnId,
    actorId: userId,
  });
  return toColumnDTO(col!);
}

export async function deleteColumn(deps: Deps, userId: string, columnId: string): Promise<void> {
  const existing = await loadColumn(deps.db, columnId);
  const { board } = await assertBoardPermission(deps.db, userId, existing.boardId, 'column:manage');
  await deps.db.delete(columns).where(eq(columns.id, columnId));
  await recordActivity(deps.db, {
    workspaceId: board.workspaceId,
    boardId: existing.boardId,
    actorId: userId,
    verb: 'column.deleted',
  });
  deps.bus.publish({ type: 'column.updated', boardId: existing.boardId, actorId: userId });
}
