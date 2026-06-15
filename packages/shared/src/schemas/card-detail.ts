import { z } from 'zod';
import { attachmentSchema } from './attachment';
import { boardCardSchema } from './card';
import { checklistSchema } from './checklist';
import { commentSchema } from './comment';

/** Everything the card detail panel needs in one fetch. */
export const cardDetailSchema = boardCardSchema.extend({
  comments: z.array(commentSchema),
  checklists: z.array(checklistSchema),
  attachments: z.array(attachmentSchema),
});

export type CardDetail = z.infer<typeof cardDetailSchema>;
