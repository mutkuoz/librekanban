import {
  type Database,
  newId,
  notificationPreferences,
  notifications,
  user,
} from '@librekanban/db';
import type { Notification } from '@librekanban/shared';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Deps } from '../lib/context';

interface NewNotification {
  recipientId: string;
  workspaceId?: string | null;
  type: string;
  data?: Record<string, unknown>;
}

export async function createNotification(db: Database, input: NewNotification): Promise<void> {
  await db.insert(notifications).values({
    id: newId(),
    recipientId: input.recipientId,
    workspaceId: input.workspaceId ?? null,
    type: input.type,
    data: input.data ?? {},
  });
}

export async function listNotifications(db: Database, userId: string): Promise<Notification[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    data: r.data as Record<string, unknown>,
    readAt: r.readAt ? r.readAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function unreadCount(db: Database, userId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)));
  return rows.length;
}

export async function markRead(db: Database, userId: string, id: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.recipientId, userId)));
}

export async function markAllRead(db: Database, userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)));
}

export async function getEmailEnabled(
  db: Database,
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const rows = await db
    .select({ emailEnabled: notificationPreferences.emailEnabled })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  return rows[0]?.emailEnabled ?? true; // default: email on
}

export async function setEmailEnabled(
  db: Database,
  userId: string,
  workspaceId: string,
  emailEnabled: boolean,
): Promise<void> {
  await db
    .insert(notificationPreferences)
    .values({ userId, workspaceId, emailEnabled })
    .onConflictDoUpdate({
      target: [notificationPreferences.userId, notificationPreferences.workspaceId],
      set: { emailEnabled },
    });
}

interface NotifyInput {
  recipientId: string;
  workspaceId: string;
  type: string;
  data?: Record<string, unknown>;
  email?: { subject: string; html: string };
}

/**
 * Create an in-app notification and (when SMTP is configured and the recipient
 * hasn't opted out) send an email — fire-and-forget so it never blocks/fails
 * the request.
 */
export async function notify(deps: Deps, input: NotifyInput): Promise<void> {
  await createNotification(deps.db, {
    recipientId: input.recipientId,
    workspaceId: input.workspaceId,
    type: input.type,
    data: input.data,
  });
  if (!input.email || !deps.email.enabled) return;
  if (!(await getEmailEnabled(deps.db, input.recipientId, input.workspaceId))) return;
  const rows = await deps.db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, input.recipientId))
    .limit(1);
  const to = rows[0]?.email;
  if (to) {
    void deps.email
      .send(to, input.email.subject, input.email.html)
      .catch((err) => deps.logger.warn({ err }, 'email send failed'));
  }
}
