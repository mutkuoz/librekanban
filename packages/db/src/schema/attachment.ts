import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { cards } from './card';

/** File attachments on a card; bytes live in the storage backend by `storageKey`. */
export const attachments = pgTable(
  'attachments',
  {
    id: text('id').primaryKey(),
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    uploadedBy: text('uploaded_by').references(() => user.id, { onDelete: 'set null' }),
    filename: text('filename').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    storageKey: text('storage_key').notNull(),
    storageBackend: text('storage_backend').notNull().default('local'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byCard: index('attachments_card_idx').on(t.cardId),
  }),
);
