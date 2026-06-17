import { type Database, cardAssignees, cards, comments, newId, user } from '@librekanban/db';
import { type Comment, type CreateCommentInput, can, parseMentions } from '@librekanban/shared';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Deps } from '../lib/context';
import { forbidden, notFound } from '../lib/errors';
import { recordActivity } from './activity';
import { notify } from './notification.service';
import { assertBoardPermission } from './permissions';
import { dispatchWebhooks } from './webhook.service';
import { listWorkspaceMembers } from './workspace.service';

type CommentRow = typeof comments.$inferSelect;
type Author = { id: string; name: string; image: string | null } | null;

const toDTO = (c: CommentRow, author: Author): Comment => ({
  id: c.id,
  cardId: c.cardId,
  body: c.body,
  author,
  editedAt: c.editedAt ? c.editedAt.toISOString() : null,
  createdAt: c.createdAt.toISOString(),
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

export async function listComments(deps: Deps, userId: string, cardId: string): Promise<Comment[]> {
  const boardId = await cardBoardId(deps.db, cardId);
  await assertBoardPermission(deps.db, userId, boardId, 'board:read');
  const rows = await deps.db
    .select({ comment: comments, authorName: user.name, authorImage: user.image })
    .from(comments)
    .leftJoin(user, eq(user.id, comments.authorId))
    .where(and(eq(comments.cardId, cardId), isNull(comments.deletedAt)))
    .orderBy(asc(comments.createdAt));
  return rows.map((r) =>
    toDTO(
      r.comment,
      r.comment.authorId
        ? { id: r.comment.authorId, name: r.authorName ?? 'Unknown', image: r.authorImage ?? null }
        : null,
    ),
  );
}

export async function createComment(
  deps: Deps,
  userId: string,
  cardId: string,
  input: CreateCommentInput,
): Promise<Comment> {
  const boardId = await cardBoardId(deps.db, cardId);
  const { board } = await assertBoardPermission(deps.db, userId, boardId, 'comment:create');
  const [created] = await deps.db
    .insert(comments)
    .values({ id: newId(), cardId, authorId: userId, body: input.body })
    .returning();
  await recordActivity(deps.db, {
    workspaceId: board.workspaceId,
    boardId,
    cardId,
    actorId: userId,
    verb: 'comment.added',
  });
  deps.bus.publish({ type: 'comment.updated', boardId, entityId: cardId, actorId: userId });
  dispatchWebhooks(deps, board.workspaceId, 'comment.added', { cardId, boardId });

  // Notify mentioned members and card assignees (mention takes precedence; skip author).
  const [members, assignees] = await Promise.all([
    listWorkspaceMembers(deps.db, board.workspaceId),
    deps.db
      .select({ userId: cardAssignees.userId })
      .from(cardAssignees)
      .where(eq(cardAssignees.cardId, cardId)),
  ]);
  const link = `${deps.env.PUBLIC_URL}/b/${boardId}`;
  const mentioned = new Set(parseMentions(input.body, members).filter((id) => id !== userId));
  for (const id of mentioned) {
    await notify(deps, {
      recipientId: id,
      workspaceId: board.workspaceId,
      type: 'comment.mention',
      data: { cardId, boardId },
      email: {
        subject: 'You were mentioned in a comment',
        html: `<p>You were mentioned in a comment.</p><p><a href="${link}">Open the board</a></p>`,
      },
    });
  }
  for (const a of assignees) {
    if (a.userId !== userId && !mentioned.has(a.userId)) {
      await notify(deps, {
        recipientId: a.userId,
        workspaceId: board.workspaceId,
        type: 'comment.added',
        data: { cardId, boardId },
        email: {
          subject: 'New comment on a card you follow',
          html: `<p>There's a new comment on a card you're assigned to.</p><p><a href="${link}">Open the board</a></p>`,
        },
      });
    }
  }

  const authorRows = await deps.db
    .select({ name: user.name, image: user.image })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  const author = authorRows[0]
    ? { id: userId, name: authorRows[0].name, image: authorRows[0].image }
    : null;
  return toDTO(created!, author);
}

export async function deleteComment(deps: Deps, userId: string, commentId: string): Promise<void> {
  const rows = await deps.db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
  const comment = rows[0];
  if (!comment || comment.deletedAt) throw notFound('Comment');
  const boardId = await cardBoardId(deps.db, comment.cardId);
  const { role } = await assertBoardPermission(deps.db, userId, boardId, 'board:read');
  if (comment.authorId !== userId && !can(role, 'comment:moderate')) {
    throw forbidden('You can only delete your own comments');
  }
  await deps.db.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, commentId));
  deps.bus.publish({ type: 'comment.updated', boardId, entityId: comment.cardId, actorId: userId });
}
