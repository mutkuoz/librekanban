import { randomBytes } from 'node:crypto';
import { type Database, invitations, newId, workspaceMembers } from '@librekanban/db';
import type { CreateInvitationInput, Invitation } from '@librekanban/shared';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Deps } from '../lib/context';
import { forbidden, notFound } from '../lib/errors';
import { assertWorkspacePermission } from './permissions';

const INVITE_TTL_DAYS = 7;

const toDTO = (i: typeof invitations.$inferSelect): Invitation => ({
  id: i.id,
  email: i.email,
  role: i.role,
  token: i.token,
  expiresAt: i.expiresAt.toISOString(),
  createdAt: i.createdAt.toISOString(),
});

export async function listInvitations(
  deps: Deps,
  actorId: string,
  workspaceId: string,
): Promise<Invitation[]> {
  await assertWorkspacePermission(deps.db, actorId, workspaceId, 'member:invite');
  const rows = await deps.db
    .select()
    .from(invitations)
    .where(and(eq(invitations.workspaceId, workspaceId), isNull(invitations.acceptedAt)))
    .orderBy(desc(invitations.createdAt));
  return rows.map(toDTO);
}

export async function createInvitation(
  deps: Deps,
  actorId: string,
  workspaceId: string,
  input: CreateInvitationInput,
): Promise<Invitation> {
  await assertWorkspacePermission(deps.db, actorId, workspaceId, 'member:invite');
  const token = `inv_${randomBytes(24).toString('base64url')}`;
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);
  const [row] = await deps.db
    .insert(invitations)
    .values({
      id: newId(),
      workspaceId,
      email: input.email.toLowerCase(),
      role: input.role,
      token,
      invitedBy: actorId,
      expiresAt,
    })
    .returning();
  if (deps.email.enabled) {
    const link = `${deps.env.PUBLIC_URL}/invite/${token}`;
    void deps.email
      .send(
        input.email,
        "You're invited to a librekanban workspace",
        `<p>You've been invited to a workspace.</p><p><a href="${link}">Accept the invitation</a></p>`,
      )
      .catch((err) => deps.logger.warn({ err }, 'invite email failed'));
  }
  return toDTO(row!);
}

export async function revokeInvitation(deps: Deps, actorId: string, id: string): Promise<void> {
  const rows = await deps.db.select().from(invitations).where(eq(invitations.id, id)).limit(1);
  const inv = rows[0];
  if (!inv) throw notFound('Invitation');
  await assertWorkspacePermission(deps.db, actorId, inv.workspaceId, 'member:invite');
  await deps.db.delete(invitations).where(eq(invitations.id, id));
}

export async function acceptInvitation(
  deps: Deps,
  userId: string,
  token: string,
): Promise<{ workspaceId: string }> {
  const rows = await deps.db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);
  const inv = rows[0];
  if (!inv || inv.acceptedAt || inv.expiresAt.getTime() < Date.now()) {
    throw forbidden('This invitation is invalid or expired');
  }
  await deps.db
    .insert(workspaceMembers)
    .values({ workspaceId: inv.workspaceId, userId, role: inv.role })
    .onConflictDoNothing();
  await deps.db
    .update(invitations)
    .set({ acceptedAt: new Date() })
    .where(eq(invitations.id, inv.id));
  return { workspaceId: inv.workspaceId };
}
