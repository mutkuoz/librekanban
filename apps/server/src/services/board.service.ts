import {
  type Database,
  attachments,
  boards,
  cardAssignees,
  cardLabels,
  cards,
  checklistItems,
  checklists,
  columns,
  comments,
  customFieldValues,
  labels,
  newId,
  swimlanes,
} from '@librekanban/db';
import type {
  Board,
  BoardCard,
  CreateBoardInput,
  CustomField,
  UpdateBoardInput,
  WorkspaceRole,
} from '@librekanban/shared';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import type { Deps } from '../lib/context';
import { notFound } from '../lib/errors';
import { toBoardDTO, toCardDTO, toColumnDTO } from '../lib/serialize';
import { slugify } from '../lib/slug';
import { recordActivity } from './activity';
import { listCustomFields } from './custom-field.service';
import { blockedCountsForBoard } from './dependency.service';
import { initialPositions, positionBetween } from './ordering';
import { assertBoardPermission, assertWorkspacePermission } from './permissions';

type BoardRow = typeof boards.$inferSelect;

async function nextBoardPosition(db: Database, workspaceId: string): Promise<string> {
  const last = await db
    .select({ position: boards.position })
    .from(boards)
    .where(eq(boards.workspaceId, workspaceId))
    .orderBy(desc(boards.position))
    .limit(1);
  return positionBetween(last[0]?.position ?? null, null);
}

interface CreateBoardCore {
  workspaceId: string;
  userId: string;
  name: string;
  description?: string | null;
  visibility?: Board['visibility'];
  color?: string | null;
  withSampleCards?: boolean;
}

/**
 * Create a board together with the structure it needs to be usable: three
 * starter columns, a default swimlane, and (optionally) a couple of sample
 * cards. Shared by the API and first-run workspace provisioning.
 */
export async function createBoardWithDefaults(
  db: Database,
  input: CreateBoardCore,
): Promise<BoardRow> {
  const position = await nextBoardPosition(db, input.workspaceId);
  const boardId = newId();
  const [colTodo, colDoing, colDone] = initialPositions(3);
  const swimlaneId = newId();
  const todoColumnId = newId();

  return db.transaction(async (tx) => {
    const [board] = await tx
      .insert(boards)
      .values({
        id: boardId,
        workspaceId: input.workspaceId,
        name: input.name,
        slug: `${slugify(input.name)}-${boardId.slice(-6).toLowerCase()}`,
        description: input.description ?? null,
        visibility: input.visibility ?? 'workspace',
        color: input.color ?? null,
        position,
        createdBy: input.userId,
        cardCounter: input.withSampleCards ? 2 : 0,
      })
      .returning();

    await tx.insert(swimlanes).values({
      id: swimlaneId,
      boardId,
      name: 'Default',
      isDefault: true,
      position: positionBetween(null, null),
    });

    await tx.insert(columns).values([
      { id: todoColumnId, boardId, name: 'To Do', position: colTodo! },
      { id: newId(), boardId, name: 'In Progress', position: colDoing! },
      { id: newId(), boardId, name: 'Done', position: colDone!, isDoneColumn: true },
    ]);

    if (input.withSampleCards) {
      const [p1, p2] = initialPositions(2);
      await tx.insert(cards).values([
        {
          id: newId(),
          boardId,
          columnId: todoColumnId,
          swimlaneId,
          number: 1,
          title: 'Welcome! Drag me to another column →',
          position: p1!,
          createdBy: input.userId,
        },
        {
          id: newId(),
          boardId,
          columnId: todoColumnId,
          swimlaneId,
          number: 2,
          title: 'Click a card to open its details',
          position: p2!,
          createdBy: input.userId,
        },
      ]);
    }

    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      boardId,
      actorId: input.userId,
      verb: 'board.created',
      data: { name: input.name },
    });

    return board!;
  });
}

/** Create a board from imported data: columns by name + cards bucketed into them. */
export async function createImportedBoard(
  db: Database,
  input: {
    workspaceId: string;
    userId: string;
    name: string;
    columnNames: string[];
    cards: { title: string; description?: string; columnName: string }[];
  },
): Promise<string> {
  const columnNames = input.columnNames.length ? input.columnNames : ['Imported'];
  const position = await nextBoardPosition(db, input.workspaceId);
  const boardId = newId();
  const swimlaneId = newId();
  const colPositions = initialPositions(columnNames.length);
  const colIdByName = new Map<string, string>();

  return db.transaction(async (tx) => {
    await tx.insert(boards).values({
      id: boardId,
      workspaceId: input.workspaceId,
      name: input.name,
      slug: `${slugify(input.name)}-${boardId.slice(-6).toLowerCase()}`,
      position,
      createdBy: input.userId,
      cardCounter: input.cards.length,
    });
    await tx.insert(swimlanes).values({
      id: swimlaneId,
      boardId,
      name: 'Default',
      isDefault: true,
      position: positionBetween(null, null),
    });
    await tx.insert(columns).values(
      columnNames.map((name, i) => {
        const id = newId();
        colIdByName.set(name, id);
        return { id, boardId, name, position: colPositions[i]! };
      }),
    );

    const buckets = new Map<string, typeof input.cards>();
    for (const c of input.cards) {
      const col = colIdByName.has(c.columnName) ? c.columnName : columnNames[0]!;
      const arr = buckets.get(col);
      if (arr) arr.push(c);
      else buckets.set(col, [c]);
    }
    const cardRows: (typeof cards.$inferInsert)[] = [];
    let number = 0;
    for (const name of columnNames) {
      const bucket = buckets.get(name) ?? [];
      const positions = initialPositions(bucket.length);
      bucket.forEach((c, i) => {
        number += 1;
        cardRows.push({
          id: newId(),
          boardId,
          columnId: colIdByName.get(name)!,
          swimlaneId,
          number,
          title: c.title,
          description: c.description ?? null,
          position: positions[i]!,
          createdBy: input.userId,
        });
      });
    }
    if (cardRows.length > 0) await tx.insert(cards).values(cardRows);

    await recordActivity(tx, {
      workspaceId: input.workspaceId,
      boardId,
      actorId: input.userId,
      verb: 'board.created',
      data: { name: input.name, imported: true },
    });
    return boardId;
  });
}

export async function listBoards(deps: Deps, workspaceId: string): Promise<Board[]> {
  const rows = await deps.db
    .select()
    .from(boards)
    .where(and(eq(boards.workspaceId, workspaceId), isNull(boards.deletedAt)))
    .orderBy(asc(boards.position));
  return rows.map(toBoardDTO);
}

export async function createBoard(
  deps: Deps,
  userId: string,
  workspaceId: string,
  input: CreateBoardInput,
): Promise<Board> {
  await assertWorkspacePermission(deps.db, userId, workspaceId, 'board:create');

  const board = await createBoardWithDefaults(deps.db, {
    workspaceId,
    userId,
    name: input.name,
    description: input.description ?? null,
    visibility: input.visibility,
    color: input.color ?? null,
  });
  deps.bus.publish({ type: 'board.updated', boardId: board.id, actorId: userId });
  return toBoardDTO(board);
}

export interface BoardDetail {
  board: Board;
  role: WorkspaceRole;
  columns: ReturnType<typeof toColumnDTO>[];
  swimlanes: { id: string; name: string; isDefault: boolean; position: string }[];
  labels: { id: string; name: string; color: string; position: string }[];
  customFields: CustomField[];
  cards: BoardCard[];
}

/** Attach per-card relations (labels, assignees, checklist progress, comment count). */
async function enrichBoardCards(
  db: Database,
  boardId: string,
  cardRows: (typeof cards.$inferSelect)[],
): Promise<BoardCard[]> {
  if (cardRows.length === 0) return [];

  const [
    labelRows,
    assigneeRows,
    checklistRows,
    commentRows,
    attachmentRows,
    cfValueRows,
    blockedCounts,
  ] = await Promise.all([
    db
      .select({ cardId: cardLabels.cardId, labelId: cardLabels.labelId })
      .from(cardLabels)
      .innerJoin(cards, eq(cards.id, cardLabels.cardId))
      .where(eq(cards.boardId, boardId)),
    db
      .select({ cardId: cardAssignees.cardId, userId: cardAssignees.userId })
      .from(cardAssignees)
      .innerJoin(cards, eq(cards.id, cardAssignees.cardId))
      .where(eq(cards.boardId, boardId)),
    db
      .select({ cardId: checklists.cardId, isDone: checklistItems.isDone })
      .from(checklistItems)
      .innerJoin(checklists, eq(checklists.id, checklistItems.checklistId))
      .innerJoin(cards, eq(cards.id, checklists.cardId))
      .where(eq(cards.boardId, boardId)),
    db
      .select({ cardId: comments.cardId })
      .from(comments)
      .innerJoin(cards, eq(cards.id, comments.cardId))
      .where(and(eq(cards.boardId, boardId), isNull(comments.deletedAt))),
    db
      .select({ cardId: attachments.cardId })
      .from(attachments)
      .innerJoin(cards, eq(cards.id, attachments.cardId))
      .where(eq(cards.boardId, boardId)),
    db
      .select({
        cardId: customFieldValues.cardId,
        fieldId: customFieldValues.fieldId,
        value: customFieldValues.value,
      })
      .from(customFieldValues)
      .innerJoin(cards, eq(cards.id, customFieldValues.cardId))
      .where(eq(cards.boardId, boardId)),
    blockedCountsForBoard(db, boardId),
  ]);

  const push = (map: Map<string, string[]>, key: string, value: string) => {
    const arr = map.get(key);
    if (arr) arr.push(value);
    else map.set(key, [value]);
  };
  const labelIds = new Map<string, string[]>();
  for (const r of labelRows) push(labelIds, r.cardId, r.labelId);
  const assigneeIds = new Map<string, string[]>();
  for (const r of assigneeRows) push(assigneeIds, r.cardId, r.userId);
  const checks = new Map<string, { done: number; total: number }>();
  for (const r of checklistRows) {
    const c = checks.get(r.cardId) ?? { done: 0, total: 0 };
    c.total += 1;
    if (r.isDone) c.done += 1;
    checks.set(r.cardId, c);
  }
  const commentCount = new Map<string, number>();
  for (const r of commentRows) commentCount.set(r.cardId, (commentCount.get(r.cardId) ?? 0) + 1);
  const attachmentCount = new Map<string, number>();
  for (const r of attachmentRows)
    attachmentCount.set(r.cardId, (attachmentCount.get(r.cardId) ?? 0) + 1);
  const cfValues = new Map<string, Record<string, unknown>>();
  for (const r of cfValueRows) {
    const m = cfValues.get(r.cardId) ?? {};
    m[r.fieldId] = r.value;
    cfValues.set(r.cardId, m);
  }

  return cardRows.map((c) => ({
    ...toCardDTO(c),
    labelIds: labelIds.get(c.id) ?? [],
    assigneeIds: assigneeIds.get(c.id) ?? [],
    checklistDone: checks.get(c.id)?.done ?? 0,
    checklistTotal: checks.get(c.id)?.total ?? 0,
    commentCount: commentCount.get(c.id) ?? 0,
    attachmentCount: attachmentCount.get(c.id) ?? 0,
    blockedCount: blockedCounts.get(c.id) ?? 0,
    customFieldValues: cfValues.get(c.id) ?? {},
  }));
}

export async function getBoardDetail(
  deps: Deps,
  userId: string,
  boardId: string,
): Promise<BoardDetail> {
  const { board, role } = await assertBoardPermission(deps.db, userId, boardId, 'board:read');

  const [columnRows, swimlaneRows, labelRows, cardRows] = await Promise.all([
    deps.db
      .select()
      .from(columns)
      .where(eq(columns.boardId, boardId))
      .orderBy(asc(columns.position)),
    deps.db
      .select()
      .from(swimlanes)
      .where(eq(swimlanes.boardId, boardId))
      .orderBy(asc(swimlanes.position)),
    deps.db.select().from(labels).where(eq(labels.boardId, boardId)).orderBy(asc(labels.position)),
    deps.db
      .select()
      .from(cards)
      .where(and(eq(cards.boardId, boardId), eq(cards.isArchived, false), isNull(cards.deletedAt)))
      .orderBy(asc(cards.position)),
  ]);

  return {
    board: toBoardDTO(board),
    role,
    columns: columnRows.map(toColumnDTO),
    swimlanes: swimlaneRows.map((s) => ({
      id: s.id,
      name: s.name,
      isDefault: s.isDefault,
      position: s.position,
    })),
    labels: labelRows.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      position: l.position,
    })),
    customFields: await listCustomFields(deps.db, boardId),
    cards: await enrichBoardCards(deps.db, boardId, cardRows),
  };
}

export async function updateBoard(
  deps: Deps,
  userId: string,
  boardId: string,
  input: UpdateBoardInput,
): Promise<Board> {
  await assertBoardPermission(deps.db, userId, boardId, 'board:update');
  const [updated] = await deps.db
    .update(boards)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
      updatedAt: new Date(),
    })
    .where(eq(boards.id, boardId))
    .returning();
  if (!updated) throw notFound('Board');

  await recordActivity(deps.db, {
    workspaceId: updated.workspaceId,
    boardId,
    actorId: userId,
    verb: 'board.updated',
  });
  deps.bus.publish({ type: 'board.updated', boardId, actorId: userId });
  return toBoardDTO(updated);
}
