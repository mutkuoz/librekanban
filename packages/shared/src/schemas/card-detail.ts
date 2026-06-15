import { z } from 'zod';
import { boardCardSchema } from './card';
import { checklistSchema } from './checklist';
import { commentSchema } from './comment';

/** Everything the card detail panel needs in one fetch. */
export const cardDetailSchema = boardCardSchema.extend({
  comments: z.array(commentSchema),
  checklists: z.array(checklistSchema),
});

export type CardDetail = z.infer<typeof cardDetailSchema>;
