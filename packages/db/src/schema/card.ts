import type { Priority } from '@librekanban/shared';
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { boards, columns, labels, swimlanes } from './board';

export const cards = pgTable(
  'cards',
  {
    id: text('id').primaryKey(),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    columnId: text('column_id')
      .notNull()
      .references(() => columns.id, { onDelete: 'cascade' }),
    swimlaneId: text('swimlane_id')
      .notNull()
      .references(() => swimlanes.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    priority: text('priority').$type<Priority>().notNull().default('none'),
    dueAt: timestamp('due_at', { withTimezone: true }),
    startAt: timestamp('start_at', { withTimezone: true }),
    position: text('position').notNull(),
    isArchived: boolean('is_archived').notNull().default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    /** Optimistic-concurrency counter, bumped on every update. */
    version: integer('version').notNull().default(1),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byColumn: index('cards_column_idx').on(t.columnId, t.swimlaneId, t.position),
    byBoard: index('cards_board_idx').on(t.boardId),
    byDue: index('cards_due_idx').on(t.dueAt),
  }),
);

export const cardAssignees = pgTable(
  'card_assignees',
  {
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.cardId, t.userId] }),
  }),
);

export const cardLabels = pgTable(
  'card_labels',
  {
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    labelId: text('label_id')
      .notNull()
      .references(() => labels.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.cardId, t.labelId] }),
  }),
);

export const comments = pgTable(
  'comments',
  {
    id: text('id').primaryKey(),
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    authorId: text('author_id').references(() => user.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byCard: index('comments_card_idx').on(t.cardId, t.createdAt),
  }),
);

export const checklists = pgTable('checklists', {
  id: text('id').primaryKey(),
  cardId: text('card_id')
    .notNull()
    .references(() => cards.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  position: text('position').notNull(),
});

export const checklistItems = pgTable(
  'checklist_items',
  {
    id: text('id').primaryKey(),
    checklistId: text('checklist_id')
      .notNull()
      .references(() => checklists.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    isDone: boolean('is_done').notNull().default(false),
    position: text('position').notNull(),
  },
  (t) => ({
    byChecklist: index('checklist_items_checklist_idx').on(t.checklistId, t.position),
  }),
);
