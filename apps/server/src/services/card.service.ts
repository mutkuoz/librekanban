import {
  type Database,
  activities,
  boards,
  cardAssignees,
  cardLabels,
  cards,
  columns,
  newId,
  swimlanes,
  user,
} from '@librekanban/db';
import type {
  Activity,
  Card,
  CardDetail,
  CreateCardInput,
  MoveCardInput,
  UpdateCardInput,
} from '@librekanban/shared';
import { and, asc, desc, eq, gt, sql } from 'drizzle-orm';
import type { Deps } from '../lib/context';
import { conflict, notFound } from '../lib/errors';
import { escapeHtml } from '../lib/html';
import { toCardDTO } from '../lib/serialize';
import { recordActivity } from './activity';
import { listAttachments } from './attachment.service';
import { listChecklists } from './checklist.service';
import { listComments } from './comment.service';
import { notify } from './notification.service';
import { positionBetween } from './ordering';
import { assertBoardPermission } from './permissions';

async function loadCard(db: Database, cardId: string) {
  const rows = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  if (!rows[0] || rows[0].deletedAt) throw notFound('Card');
  return rows[0];
}

async function defaultSwimlaneId(db: Database, boardId: string): Promise<string> {
  const rows = await db
    .select({ id: swimlanes.id })
    .from(swimlanes)
    .where(and(eq(swimlanes.boardId, boardId), eq(swimlanes.isDefault, true)))
    .limit(1);
  if (!rows[0]) throw notFound('Default swimlane');
  return rows[0].id;
}

async function positionOf(db: Database, cardId: string | null): Promise<string | null> {
  if (!cardId) return null;
  const rows = await db
    .select({ position: cards.position })
    .from(cards)
    .where(eq(cards.id, cardId))
    .limit(1);
  return rows[0]?.position ?? null;
}

/** Position for a card appended to (columnId, swimlaneId), or after `afterCardId`. */
async function positionForNewCard(
  db: Database,
  columnId: string,
  swimlaneId: string,
  afterCardId: string | null,
): Promise<string> {
  if (afterCardId) {
    const afterPos = await positionOf(db, afterCardId);
    const nextRows = afterPos
      ? await db
          .select({ position: cards.position })
          .from(cards)
          .where(
            and(
              eq(cards.columnId, columnId),
              eq(cards.swimlaneId, swimlaneId),
              gt(cards.position, afterPos),
            ),
          )
          .orderBy(asc(cards.position))
          .limit(1)
      : [];
    return positionBetween(afterPos, nextRows[0]?.position ?? null);
  }
  const last = await db
    .select({ position: cards.position })
    .from(cards)
    .where(and(eq(cards.columnId, columnId), eq(cards.swimlaneId, swimlaneId)))
    .orderBy(desc(cards.position))
    .limit(1);
  return positionBetween(last[0]?.position ?? null, null);
}

export async function createCard(
  deps: Deps,
  userId: string,
  input: CreateCardInput,
): Promise<Card> {
  const colRows = await deps.db
    .select({ boardId: columns.boardId })
    .from(columns)
    .where(eq(columns.id, input.columnId))
    .limit(1);
  if (!colRows[0]) throw notFound('Column');
  const boardId = colRows[0].boardId;

  const { board } = await assertBoardPermission(deps.db, userId, boardId, 'card:create');
  const swimlaneId = input.swimlaneId ?? (await defaultSwimlaneId(deps.db, boardId));
  const position = await positionForNewCard(
    deps.db,
    input.columnId,
    swimlaneId,
    input.afterCardId ?? null,
  );

  const card = await deps.db.transaction(async (tx) => {
    const [counter] = await tx
      .update(boards)
      .set({ cardCounter: sql`${boards.cardCounter} + 1` })
      .where(eq(boards.id, boardId))
      .returning({ number: boards.cardCounter });

    const [created] = await tx
      .insert(cards)
      .values({
        id: newId(),
        boardId,
        columnId: input.columnId,
        swimlaneId,
        number: counter!.number,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? 'none',
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        startAt: input.startAt ? new Date(input.startAt) : null,
        position,
        createdBy: userId,
      })
      .returning();

    await recordActivity(tx, {
      workspaceId: board.workspaceId,
      boardId,
      cardId: created!.id,
      actorId: userId,
      verb: 'card.created',
      data: { title: input.title },
    });
    return created!;
  });

  deps.bus.publish({ type: 'card.updated', boardId, entityId: card.id, actorId: userId });
  return toCardDTO(card);
}

export async function updateCard(
  deps: Deps,
  userId: string,
  cardId: string,
  input: UpdateCardInput,
): Promise<Card> {
  const existing = await loadCard(deps.db, cardId);
  const { board } = await assertBoardPermission(deps.db, userId, existing.boardId, 'card:update');

  if (input.version !== undefined && input.version !== existing.version) {
    throw conflict('This card was changed by someone else. Reload and try again.');
  }

  const [updated] = await deps.db
    .update(cards)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.dueAt !== undefined ? { dueAt: input.dueAt ? new Date(input.dueAt) : null } : {}),
      ...(input.startAt !== undefined
        ? { startAt: input.startAt ? new Date(input.startAt) : null }
        : {}),
      ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
      version: existing.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(cards.id, cardId))
    .returning();

  await recordActivity(deps.db, {
    workspaceId: board.workspaceId,
    boardId: existing.boardId,
    cardId,
    actorId: userId,
    verb: 'card.updated',
  });
  deps.bus.publish({
    type: 'card.updated',
    boardId: existing.boardId,
    entityId: cardId,
    version: updated!.version,
    actorId: userId,
  });
  return toCardDTO(updated!);
}

export async function moveCard(
  deps: Deps,
  userId: string,
  cardId: string,
  input: MoveCardInput,
): Promise<Card> {
  const existing = await loadCard(deps.db, cardId);
  const { board } = await assertBoardPermission(deps.db, userId, existing.boardId, 'card:move');

  // Validate the target column belongs to the same board, and learn if it's "done".
  const targetCol = await deps.db
    .select({ boardId: columns.boardId, isDone: columns.isDoneColumn })
    .from(columns)
    .where(eq(columns.id, input.columnId))
    .limit(1);
  if (!targetCol[0] || targetCol[0].boardId !== existing.boardId) {
    throw notFound('Target column');
  }

  const swimlaneId = input.swimlaneId ?? existing.swimlaneId;
  const [prevPos, nextPos] = await Promise.all([
    positionOf(deps.db, input.prevCardId),
    positionOf(deps.db, input.nextCardId),
  ]);

  const movingToDone = targetCol[0].isDone;
  const [updated] = await deps.db
    .update(cards)
    .set({
      columnId: input.columnId,
      swimlaneId,
      position: positionBetween(prevPos, nextPos),
      completedAt: movingToDone ? (existing.completedAt ?? new Date()) : null,
      version: existing.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(cards.id, cardId))
    .returning();

  await recordActivity(deps.db, {
    workspaceId: board.workspaceId,
    boardId: existing.boardId,
    cardId,
    actorId: userId,
    verb: 'card.moved',
    data: { toColumnId: input.columnId },
  });
  deps.bus.publish({
    type: 'card.moved',
    boardId: existing.boardId,
    entityId: cardId,
    version: updated!.version,
    actorId: userId,
  });
  return toCardDTO(updated!);
}

export async function deleteCard(deps: Deps, userId: string, cardId: string): Promise<void> {
  const existing = await loadCard(deps.db, cardId);
  const { board } = await assertBoardPermission(deps.db, userId, existing.boardId, 'card:delete');
  await deps.db.update(cards).set({ deletedAt: new Date() }).where(eq(cards.id, cardId));
  await recordActivity(deps.db, {
    workspaceId: board.workspaceId,
    boardId: existing.boardId,
    cardId,
    actorId: userId,
    verb: 'card.deleted',
  });
  deps.bus.publish({
    type: 'card.updated',
    boardId: existing.boardId,
    entityId: cardId,
    actorId: userId,
  });
}

export async function assignCard(
  deps: Deps,
  userId: string,
  cardId: string,
  assigneeId: string,
): Promise<void> {
  const card = await loadCard(deps.db, cardId);
  const { board } = await assertBoardPermission(deps.db, userId, card.boardId, 'card:update');
  await deps.db.insert(cardAssignees).values({ cardId, userId: assigneeId }).onConflictDoNothing();
  if (assigneeId !== userId) {
    const link = `${deps.env.PUBLIC_URL}/b/${card.boardId}`;
    await notify(deps, {
      recipientId: assigneeId,
      workspaceId: board.workspaceId,
      type: 'card.assigned',
      data: { cardId, cardTitle: card.title, boardId: card.boardId },
      email: {
        subject: `You were assigned: ${card.title}`,
        html: `<p>You were assigned to <b>${escapeHtml(card.title)}</b>.</p><p><a href="${link}">Open the board</a></p>`,
      },
    });
  }
  deps.bus.publish({
    type: 'card.updated',
    boardId: card.boardId,
    entityId: cardId,
    actorId: userId,
  });
}

export async function unassignCard(
  deps: Deps,
  userId: string,
  cardId: string,
  assigneeId: string,
): Promise<void> {
  const card = await loadCard(deps.db, cardId);
  await assertBoardPermission(deps.db, userId, card.boardId, 'card:update');
  await deps.db
    .delete(cardAssignees)
    .where(and(eq(cardAssignees.cardId, cardId), eq(cardAssignees.userId, assigneeId)));
  deps.bus.publish({
    type: 'card.updated',
    boardId: card.boardId,
    entityId: cardId,
    actorId: userId,
  });
}

/** Full card with relations, comments and checklists — for the detail panel. */
export async function getCardDetail(
  deps: Deps,
  userId: string,
  cardId: string,
): Promise<CardDetail> {
  const card = await loadCard(deps.db, cardId);
  await assertBoardPermission(deps.db, userId, card.boardId, 'board:read');

  const [labelRows, assigneeRows, checklists, comments, attachments] = await Promise.all([
    deps.db
      .select({ labelId: cardLabels.labelId })
      .from(cardLabels)
      .where(eq(cardLabels.cardId, cardId)),
    deps.db
      .select({ userId: cardAssignees.userId })
      .from(cardAssignees)
      .where(eq(cardAssignees.cardId, cardId)),
    listChecklists(deps.db, cardId),
    listComments(deps, userId, cardId),
    listAttachments(deps.db, cardId),
  ]);

  const checklistTotal = checklists.reduce((n, c) => n + c.items.length, 0);
  const checklistDone = checklists.reduce((n, c) => n + c.items.filter((i) => i.isDone).length, 0);

  return {
    ...toCardDTO(card),
    labelIds: labelRows.map((r) => r.labelId),
    assigneeIds: assigneeRows.map((r) => r.userId),
    checklistDone,
    checklistTotal,
    commentCount: comments.length,
    attachmentCount: attachments.length,
    comments,
    checklists,
    attachments,
  };
}

/** Activity/history entries for a card, newest first. */
export async function getCardActivity(
  deps: Deps,
  userId: string,
  cardId: string,
): Promise<Activity[]> {
  const card = await loadCard(deps.db, cardId);
  await assertBoardPermission(deps.db, userId, card.boardId, 'board:read');
  const rows = await deps.db
    .select({
      id: activities.id,
      verb: activities.verb,
      data: activities.data,
      createdAt: activities.createdAt,
      actorName: user.name,
    })
    .from(activities)
    .leftJoin(user, eq(user.id, activities.actorId))
    .where(eq(activities.cardId, cardId))
    .orderBy(desc(activities.createdAt))
    .limit(50);
  return rows.map((r) => ({
    id: r.id,
    verb: r.verb,
    actorName: r.actorName ?? null,
    data: (r.data ?? {}) as Record<string, unknown>,
    createdAt: r.createdAt.toISOString(),
  }));
}
