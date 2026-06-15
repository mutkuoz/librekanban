import type { BoardVisibility, WorkspaceRole } from '@librekanban/shared';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { workspaces } from './workspace';

export const boards = pgTable(
  'boards',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    visibility: text('visibility').$type<BoardVisibility>().notNull().default('workspace'),
    color: text('color'),
    settings: jsonb('settings').notNull().default({}),
    isArchived: boolean('is_archived').notNull().default(false),
    position: text('position').notNull(),
    /** Per-board running counter for human-friendly card numbers (BOARD-123). */
    cardCounter: integer('card_counter').notNull().default(0),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byWorkspace: index('boards_workspace_idx').on(t.workspaceId),
  }),
);

/** Per-board role overrides (mainly for private boards). */
export const boardMembers = pgTable(
  'board_members',
  {
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').$type<WorkspaceRole>().notNull().default('member'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.boardId, t.userId] }),
  }),
);

export const columns = pgTable(
  'columns',
  {
    id: text('id').primaryKey(),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    wipLimit: integer('wip_limit'),
    color: text('color'),
    isDoneColumn: boolean('is_done_column').notNull().default(false),
    position: text('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byBoard: index('columns_board_idx').on(t.boardId, t.position),
  }),
);

export const swimlanes = pgTable(
  'swimlanes',
  {
    id: text('id').primaryKey(),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    color: text('color'),
    position: text('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byBoard: index('swimlanes_board_idx').on(t.boardId, t.position),
  }),
);

export const labels = pgTable(
  'labels',
  {
    id: text('id').primaryKey(),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('#64748b'),
    position: text('position').notNull(),
  },
  (t) => ({
    byBoard: index('labels_board_idx').on(t.boardId),
  }),
);
