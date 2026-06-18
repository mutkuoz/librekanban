import { type Database, boardViews, newId } from '@librekanban/db';
import {
  type CreateSavedViewInput,
  type SavedView,
  type SortKey,
  boardFilterSchema,
} from '@librekanban/shared';
import { asc, eq } from 'drizzle-orm';
import type { Deps } from '../lib/context';
import { notFound } from '../lib/errors';
import { assertBoardPermission } from './permissions';

const toDTO = (r: typeof boardViews.$inferSelect): SavedView => ({
  id: r.id,
  boardId: r.boardId,
  name: r.name,
  filter: boardFilterSchema.parse(r.filter),
  sort: r.sort as SortKey,
  createdBy: r.createdBy,
  createdAt: r.createdAt.toISOString(),
});

export async function listViews(deps: Deps, userId: string, boardId: string): Promise<SavedView[]> {
  await assertBoardPermission(deps.db, userId, boardId, 'board:read');
  const rows = await deps.db
    .select()
    .from(boardViews)
    .where(eq(boardViews.boardId, boardId))
    .orderBy(asc(boardViews.createdAt));
  return rows.map(toDTO);
}

export async function createView(
  deps: Deps,
  userId: string,
  boardId: string,
  input: CreateSavedViewInput,
): Promise<SavedView> {
  await assertBoardPermission(deps.db, userId, boardId, 'card:create');
  const [row] = await deps.db
    .insert(boardViews)
    .values({
      id: newId(),
      boardId,
      name: input.name,
      filter: input.filter,
      sort: input.sort,
      createdBy: userId,
    })
    .returning();
  return toDTO(row as typeof boardViews.$inferSelect);
}

export async function deleteView(deps: Deps, userId: string, id: string): Promise<void> {
  const rows = await deps.db.select().from(boardViews).where(eq(boardViews.id, id)).limit(1);
  const view = rows[0];
  if (!view) throw notFound('View');
  // Members may delete their own; deleting someone else's needs board-admin.
  const action = view.createdBy === userId ? 'board:read' : 'board:delete';
  await assertBoardPermission(deps.db, userId, view.boardId, action);
  await deps.db.delete(boardViews).where(eq(boardViews.id, id));
}
