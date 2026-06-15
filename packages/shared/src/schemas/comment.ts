import { z } from 'zod';
import { idSchema } from './common';

export const createCommentSchema = z.object({
  body: z.string().min(1).max(10_000),
});

export const updateCommentSchema = createCommentSchema;

export const commentSchema = z.object({
  id: idSchema,
  cardId: idSchema,
  body: z.string(),
  author: z.object({ id: idSchema, name: z.string(), image: z.string().nullable() }).nullable(),
  editedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type Comment = z.infer<typeof commentSchema>;
