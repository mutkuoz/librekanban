import type { ActivityVerb } from '@librekanban/shared';
import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { boards } from './board';
import { cards } from './card';
import { workspaces } from './workspace';

/**
 * The audit log AND the single event source. Every domain mutation writes one
 * row here inside its transaction; after commit the same event fans out to
 * realtime subscribers, notifications, and webhooks.
 */
export const activities = pgTable(
  'activities',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    boardId: text('board_id').references(() => boards.id, { onDelete: 'cascade' }),
    cardId: text('card_id').references(() => cards.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    verb: text('verb').$type<ActivityVerb>().notNull(),
    data: jsonb('data').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byBoard: index('activities_board_idx').on(t.boardId, t.createdAt),
    byCard: index('activities_card_idx').on(t.cardId, t.createdAt),
  }),
);
