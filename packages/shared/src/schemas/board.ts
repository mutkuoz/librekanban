import { z } from 'zod';
import { BOARD_VISIBILITIES } from '../enums';
import { colorSchema, idSchema } from './common';

export const createBoardSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  visibility: z.enum(BOARD_VISIBILITIES).default('workspace'),
  color: colorSchema.optional(),
});

export const updateBoardSchema = createBoardSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

export const boardSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  visibility: z.enum(BOARD_VISIBILITIES),
  color: z.string().nullable(),
  isArchived: z.boolean(),
  position: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// `z.input` so fields with server-side defaults (e.g. visibility) are optional
// for callers; the server still receives the fully-defaulted output type.
export type CreateBoardInput = z.input<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type Board = z.infer<typeof boardSchema>;
