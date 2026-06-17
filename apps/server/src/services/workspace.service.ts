import {
  type Database,
  newId,
  user as userTable,
  workspaceMembers,
  workspaces,
} from '@librekanban/db';
import type { WorkspaceMember, WorkspaceRole } from '@librekanban/shared';
import { and, eq } from 'drizzle-orm';
import type { SessionUser } from '../lib/context';
import { forbidden, notFound } from '../lib/errors';
import { slugify } from '../lib/slug';
import { createBoardWithDefaults } from './board.service';
import { assertWorkspacePermission, primaryWorkspaceId, workspaceRoleOf } from './permissions';

async function countOwners(db: Database, workspaceId: string): Promise<number> {
  const rows = await db
    .select({ uid: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.role, 'owner')));
  return rows.length;
}

export async function setMemberRole(
  db: Database,
  actorId: string,
  workspaceId: string,
  targetUserId: string,
  role: WorkspaceRole,
): Promise<void> {
  await assertWorkspacePermission(db, actorId, workspaceId, 'member:setRole');
  const current = await workspaceRoleOf(db, workspaceId, targetUserId);
  if (!current) throw notFound('Member');
  if (current === 'owner' && role !== 'owner' && (await countOwners(db, workspaceId)) <= 1) {
    throw forbidden('Cannot demote the last owner');
  }
  await db
    .update(workspaceMembers)
    .set({ role })
    .where(
      and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, targetUserId)),
    );
}

export async function removeMember(
  db: Database,
  actorId: string,
  workspaceId: string,
  targetUserId: string,
): Promise<void> {
  await assertWorkspacePermission(db, actorId, workspaceId, 'member:remove');
  const current = await workspaceRoleOf(db, workspaceId, targetUserId);
  if (!current) throw notFound('Member');
  if (current === 'owner') {
    if ((await workspaceRoleOf(db, workspaceId, actorId)) !== 'owner') {
      throw forbidden('Only an owner can remove an owner');
    }
    if ((await countOwners(db, workspaceId)) <= 1) throw forbidden('Cannot remove the last owner');
  }
  await db
    .delete(workspaceMembers)
    .where(
      and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, targetUserId)),
    );
}

/** Create a personal workspace (owner membership) + a sample board for a user. */
export async function provisionWorkspaceForUser(db: Database, user: SessionUser): Promise<string> {
  const workspaceId = newId();
  const first = user.name?.trim().split(/\s+/)[0] || 'My';
  await db.transaction(async (tx) => {
    await tx.insert(workspaces).values({
      id: workspaceId,
      name: `${first}'s Workspace`,
      slug: `${slugify(first)}-${workspaceId.slice(-6).toLowerCase()}`,
      createdBy: user.id,
    });
    await tx.insert(workspaceMembers).values({ workspaceId, userId: user.id, role: 'owner' });
  });
  await createBoardWithDefaults(db, {
    workspaceId,
    userId: user.id,
    name: 'Welcome to librekanban',
    withSampleCards: true,
  });
  return workspaceId;
}

/** Ensure the user has a workspace, provisioning one on first access. */
export async function ensureUserWorkspace(db: Database, user: SessionUser): Promise<string> {
  const existing = await primaryWorkspaceId(db, user.id);
  return existing ?? provisionWorkspaceForUser(db, user);
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
}

export async function listUserWorkspaces(
  db: Database,
  userId: string,
): Promise<WorkspaceSummary[]> {
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId));
  return rows;
}

/** Members of a workspace, with profile info — for assignee pickers and avatars. */
export async function listWorkspaceMembers(
  db: Database,
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  return db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(userTable, eq(userTable.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
}
