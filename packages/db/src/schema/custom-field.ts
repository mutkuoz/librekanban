import type { CustomFieldType } from '@librekanban/shared';
import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { boards } from './board';
import { cards } from './card';
import { workspaces } from './workspace';

/** A custom field defined on a board (e.g. "Story points": number). */
export const customFieldDefinitions = pgTable(
  'custom_field_definitions',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    boardId: text('board_id').references(() => boards.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type').$type<CustomFieldType>().notNull(),
    config: jsonb('config').notNull().default({}),
    position: text('position').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byBoard: index('custom_field_defs_board_idx').on(t.boardId),
  }),
);

/** A field's value on a specific card (typed payload stored as JSONB). */
export const customFieldValues = pgTable(
  'custom_field_values',
  {
    id: text('id').primaryKey(),
    fieldId: text('field_id')
      .notNull()
      .references(() => customFieldDefinitions.id, { onDelete: 'cascade' }),
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    value: jsonb('value'),
  },
  (t) => ({
    uniq: uniqueIndex('custom_field_values_field_card_uniq').on(t.fieldId, t.cardId),
    byCard: index('custom_field_values_card_idx').on(t.cardId),
  }),
);
