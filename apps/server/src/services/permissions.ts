import { type Database, boardMembers, boards, workspaceMembers } from '@librekanban/db';
import { type Action, type WorkspaceRole, can, maxRole } from '@librekanban/shared';
import { and, eq } from 'drizzle-orm';
import { forbidden, notFound } from '../lib/errors';

type BoardRow = typeof boards.$inferSelect;

/** The user's role in a workspace, or null if not a member. */
export async function workspaceRoleOf(
  db: Database,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRole | null> {
  const rows = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  return rows[0]?.role ?? null;
}

/** Assert the user may perform `action` in a workspace; returns their role. */
export async function assertWorkspacePermission(
  db: Database,
  userId: string,
  workspaceId: string,
  action: Action,
): Promise<WorkspaceRole> {
  const role = await workspaceRoleOf(db, workspaceId, userId);
  if (!role || !can(role, action)) throw forbidden(`Not allowed: ${action}`);
  return role;
}

/**
 * Resolve a user's effective access to a board: the more-privileged of their
 * workspace role and any board-level override. Enforces private-board access.
 */
export async function resolveBoardAccess(
  db: Database,
  boardId: string,
  userId: string,
): Promise<{ board: BoardRow; role: WorkspaceRole }> {
  const boardRows = await db.select().from(boards).where(eq(boards.id, boardId)).limit(1);
  const board = boardRows[0];
  if (!board || board.deletedAt) throw notFound('Board');

  const wsRole = await workspaceRoleOf(db, board.workspaceId, userId);
  const overrideRows = await db
    .select({ role: boardMembers.role })
    .from(boardMembers)
    .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)))
    .limit(1);
  const boardRole = overrideRows[0]?.role ?? null;

  if (!wsRole && !boardRole) throw forbidden('You do not have access to this board');

  let role: WorkspaceRole = boardRole ?? wsRole!;
  if (wsRole && boardRole) role = maxRole(wsRole, boardRole);

  // Private boards require an explicit board membership (or admin+ in the workspace).
  if (board.visibility === 'private' && !boardRole && (!wsRole || !can(wsRole, 'board:delete'))) {
    throw forbidden('This board is private');
  }
  return { board, role };
}

/** Assert the user may perform `action` on a board; returns board + role. */
export async function assertBoardPermission(
  db: Database,
  userId: string,
  boardId: string,
  action: Action,
): Promise<{ board: BoardRow; role: WorkspaceRole }> {
  const access = await resolveBoardAccess(db, boardId, userId);
  if (!can(access.role, action)) throw forbidden(`Not allowed: ${action}`);
  return access;
}

/** The user's primary (first-joined) workspace id, or null. */
export async function primaryWorkspaceId(db: Database, userId: string): Promise<string | null> {
  const rows = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaceMembers.createdAt)
    .limit(1);
  return rows[0]?.workspaceId ?? null;
}
