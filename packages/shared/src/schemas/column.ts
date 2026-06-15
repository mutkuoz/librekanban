import { z } from 'zod';
import { colorSchema, idSchema } from './common';

export const createColumnSchema = z.object({
  name: z.string().min(1).max(80),
  wipLimit: z.number().int().min(0).max(999).nullable().optional(),
  color: colorSchema.optional(),
  isDoneColumn: z.boolean().optional(),
  /** Insert position: place the new column after this one (null = first). */
  afterColumnId: idSchema.nullable().optional(),
});

export const updateColumnSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  wipLimit: z.number().int().min(0).max(999).nullable().optional(),
  color: colorSchema.optional(),
  isDoneColumn: z.boolean().optional(),
});

export const moveColumnSchema = z.object({
  prevColumnId: idSchema.nullable(),
  nextColumnId: idSchema.nullable(),
});

export const columnSchema = z.object({
  id: idSchema,
  boardId: idSchema,
  name: z.string(),
  wipLimit: z.number().nullable(),
  color: z.string().nullable(),
  isDoneColumn: z.boolean(),
  position: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;
export type MoveColumnInput = z.infer<typeof moveColumnSchema>;
export type Column = z.infer<typeof columnSchema>;
