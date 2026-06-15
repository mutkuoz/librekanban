import { z } from 'zod';
import { idSchema } from './common';

export const createChecklistSchema = z.object({
  title: z.string().min(1).max(120),
});

export const createChecklistItemSchema = z.object({
  content: z.string().min(1).max(500),
});

export const updateChecklistItemSchema = z.object({
  content: z.string().min(1).max(500).optional(),
  isDone: z.boolean().optional(),
});

export const checklistItemSchema = z.object({
  id: idSchema,
  checklistId: idSchema,
  content: z.string(),
  isDone: z.boolean(),
  position: z.string(),
});

export const checklistSchema = z.object({
  id: idSchema,
  cardId: idSchema,
  title: z.string(),
  position: z.string(),
  items: z.array(checklistItemSchema),
});

export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export type Checklist = z.infer<typeof checklistSchema>;
