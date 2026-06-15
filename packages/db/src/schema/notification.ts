import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { workspaces } from './workspace';

/** Per-user in-app notifications (assignments, comments on your cards, …). */
export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    recipientId: text('recipient_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    data: jsonb('data').notNull().default({}),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byRecipient: index('notifications_recipient_idx').on(t.recipientId, t.readAt, t.createdAt),
  }),
);
