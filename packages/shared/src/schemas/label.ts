import { z } from 'zod';
import { colorSchema, idSchema } from './common';

export const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: colorSchema,
});

export const updateLabelSchema = createLabelSchema.partial();

export const labelSchema = z.object({
  id: idSchema,
  boardId: idSchema,
  name: z.string(),
  color: z.string(),
  position: z.string(),
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
export type Label = z.infer<typeof labelSchema>;
