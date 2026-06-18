import { z } from 'zod';
import { SORT_KEYS, boardFilterSchema } from './board-view';
import { idSchema } from './common';

export const savedViewSchema = z.object({
  id: idSchema,
  boardId: idSchema,
  name: z.string(),
  filter: boardFilterSchema,
  sort: z.enum(SORT_KEYS),
  createdBy: idSchema.nullable(),
  createdAt: z.string(),
});

export const createSavedViewSchema = z.object({
  name: z.string().min(1).max(100),
  filter: boardFilterSchema,
  sort: z.enum(SORT_KEYS),
});

export type SavedView = z.infer<typeof savedViewSchema>;
export type CreateSavedViewInput = z.infer<typeof createSavedViewSchema>;
