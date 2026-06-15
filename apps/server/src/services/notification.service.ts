import { type Database, newId, notifications } from '@librekanban/db';
import type { Notification } from '@librekanban/shared';
import { and, desc, eq, isNull } from 'drizzle-orm';

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
