import type { BoardFilter } from '@librekanban/shared';
import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { boards } from './board';

/**
 * A named, board-scoped saved view: a persisted filter + sort preset. Shared
 * with every member of the board (anyone can create; the creator or a board
 * admin can delete).
 */
export const boardViews = pgTable(
  'board_views',
  {
    id: text('id').primaryKey(),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    filter: jsonb('filter').$type<BoardFilter>().notNull(),
    sort: text('sort').notNull().default('manual'),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byBoard: index('board_views_board_idx').on(t.boardId, t.createdAt),
  }),
);
