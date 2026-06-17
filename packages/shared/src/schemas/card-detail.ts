import { z } from 'zod';
import { attachmentSchema } from './attachment';
import { boardCardSchema } from './card';
import { checklistSchema } from './checklist';
import { commentSchema } from './comment';
import { idSchema } from './common';

/** A linked card (dependency), shown in the "Blocked by"/"Blocking" lists. */
export const cardLinkSchema = z.object({
  id: idSchema,
  number: z.number().int(),
  title: z.string(),
  /** True once the linked card is completed (in a "done" column). */
  isComplete: z.boolean(),
});

export type CardLink = z.infer<typeof cardLinkSchema>;

/** Everything the card detail panel needs in one fetch. */
export const cardDetailSchema = boardCardSchema.extend({
  comments: z.array(commentSchema),
  checklists: z.array(checklistSchema),
  attachments: z.array(attachmentSchema),
  /** Cards that block this one (must complete first). */
  blockedBy: z.array(cardLinkSchema),
  /** Cards that this one blocks. */
  blocking: z.array(cardLinkSchema),
});

export type CardDetail = z.infer<typeof cardDetailSchema>;
