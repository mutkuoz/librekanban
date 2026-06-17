import { type Database, cardDependencies, cards } from '@librekanban/db';
import type { CardLink } from '@librekanban/shared';
import { and, eq } from 'drizzle-orm';
import type { Deps } from '../lib/context';
import { badRequest, notFound } from '../lib/errors';
import { recordActivity } from './activity';
import { assertBoardPermission } from './permissions';
import { dispatchWebhooks } from './webhook.service';

async function loadCardForLink(db: Database, cardId: string) {
  const rows = await db
    .select({
      id: cards.id,
      boardId: cards.boardId,
      number: cards.number,
      title: cards.title,
      deletedAt: cards.deletedAt,
    })
    .from(cards)
    .where(eq(cards.id, cardId))
    .limit(1);
  if (!rows[0] || rows[0].deletedAt) throw notFound('Card');
  return rows[0];
}

/**
 * Adding `blockerId → blockedId` creates a cycle iff `blockedId` can already
 * reach `blockerId` by following existing blocks-edges. We load the board's
 * edges once and walk them in memory (boards are small enough for this).
 */
async function wouldCreateCycle(
  db: Database,
  boardId: string,
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  if (blockerId === blockedId) return true;
  const edges = await db
    .select({ blockerId: cardDependencies.blockerId, blockedId: cardDependencies.blockedId })
    .from(cardDependencies)
    .innerJoin(cards, eq(cards.id, cardDependencies.blockerId))
    .where(eq(cards.boardId, boardId));

  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const arr = adj.get(e.blockerId);
    if (arr) arr.push(e.blockedId);
    else adj.set(e.blockerId, [e.blockedId]);
  }

  const seen = new Set<string>();
  const stack = [blockedId];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    if (cur === blockerId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const next of adj.get(cur) ?? []) stack.push(next);
  }
  return false;
}

/** Make `blockedId` blocked by `blockerId`. Requires `card:update` on the board. */
export async function addDependency(
  deps: Deps,
  userId: string,
  blockedId: string,
  blockerId: string,
): Promise<void> {
  const [blocked, blocker] = await Promise.all([
    loadCardForLink(deps.db, blockedId),
    loadCardForLink(deps.db, blockerId),
  ]);
  if (blocked.boardId !== blocker.boardId) {
    throw badRequest('cross_board', 'Both cards must be on the same board');
  }
  const { board } = await assertBoardPermission(deps.db, userId, blocked.boardId, 'card:update');
  if (await wouldCreateCycle(deps.db, blocked.boardId, blockerId, blockedId)) {
    throw badRequest('dependency_cycle', 'That would create a circular dependency');
  }

  await deps.db
    .insert(cardDependencies)
    .values({ blockerId, blockedId, createdBy: userId })
    .onConflictDoNothing();

  await recordActivity(deps.db, {
    workspaceId: board.workspaceId,
    boardId: blocked.boardId,
    cardId: blockedId,
    actorId: userId,
    verb: 'card.linked',
    data: { blockerId, blockerNumber: blocker.number, blockerTitle: blocker.title },
  });
  // Both endpoints changed — invalidate each so open detail panels refresh.
  deps.bus.publish({
    type: 'card.updated',
    boardId: blocked.boardId,
    entityId: blockedId,
    actorId: userId,
  });
  deps.bus.publish({
    type: 'card.updated',
    boardId: blocked.boardId,
    entityId: blockerId,
    actorId: userId,
  });
  dispatchWebhooks(deps, board.workspaceId, 'card.linked', {
    cardId: blockedId,
    blockerId,
    boardId: blocked.boardId,
  });
}

/** Remove the `blockerId → blockedId` dependency. Requires `card:update`. */
export async function removeDependency(
  deps: Deps,
  userId: string,
  blockedId: string,
  blockerId: string,
): Promise<void> {
  const blocked = await loadCardForLink(deps.db, blockedId);
  const { board } = await assertBoardPermission(deps.db, userId, blocked.boardId, 'card:update');
  await deps.db
    .delete(cardDependencies)
    .where(
      and(eq(cardDependencies.blockerId, blockerId), eq(cardDependencies.blockedId, blockedId)),
    );

  await recordActivity(deps.db, {
    workspaceId: board.workspaceId,
    boardId: blocked.boardId,
    cardId: blockedId,
    actorId: userId,
    verb: 'card.unlinked',
    data: { blockerId },
  });
  deps.bus.publish({
    type: 'card.updated',
    boardId: blocked.boardId,
    entityId: blockedId,
    actorId: userId,
  });
  deps.bus.publish({
    type: 'card.updated',
    boardId: blocked.boardId,
    entityId: blockerId,
    actorId: userId,
  });
}

const toLink = (r: {
  id: string;
  number: number;
  title: string;
  completedAt: Date | null;
}): CardLink => ({
  id: r.id,
  number: r.number,
  title: r.title,
  isComplete: r.completedAt != null,
});

/** The dependency lists for a single card (for the detail panel). */
export async function listCardDependencies(
  db: Database,
  cardId: string,
): Promise<{ blockedBy: CardLink[]; blocking: CardLink[] }> {
  const cols = {
    id: cards.id,
    number: cards.number,
    title: cards.title,
    completedAt: cards.completedAt,
  };
  const [blockedByRows, blockingRows] = await Promise.all([
    db
      .select(cols)
      .from(cardDependencies)
      .innerJoin(cards, eq(cards.id, cardDependencies.blockerId))
      .where(eq(cardDependencies.blockedId, cardId)),
    db
      .select(cols)
      .from(cardDependencies)
      .innerJoin(cards, eq(cards.id, cardDependencies.blockedId))
      .where(eq(cardDependencies.blockerId, cardId)),
  ]);
  return { blockedBy: blockedByRows.map(toLink), blocking: blockingRows.map(toLink) };
}

/** Map of blocked-card-id → number of *incomplete* blockers, for the whole board. */
export async function blockedCountsForBoard(
  db: Database,
  boardId: string,
): Promise<Map<string, number>> {
  const rows = await db
    .select({ blockedId: cardDependencies.blockedId, completedAt: cards.completedAt })
    .from(cardDependencies)
    .innerJoin(cards, eq(cards.id, cardDependencies.blockerId))
    .where(eq(cards.boardId, boardId));
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.completedAt == null) counts.set(r.blockedId, (counts.get(r.blockedId) ?? 0) + 1);
  }
  return counts;
}
