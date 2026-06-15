import { boolean, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { workspaces } from './workspace';

/** Per-user, per-workspace notification preferences (email opt-in/out). */
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    emailEnabled: boolean('email_enabled').notNull().default(true),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.workspaceId] }),
  }),
);
