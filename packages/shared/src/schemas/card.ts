import { z } from 'zod';
import { idSchema } from './common';

export const PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const createCardSchema = z.object({
  columnId: idSchema,
  swimlaneId: idSchema.optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(50_000).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  startAt: z.string().datetime().nullable().optional(),
  /** Insert position within the column: after this card (null = top). */
  afterCardId: idSchema.nullable().optional(),
});

export const updateCardSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(50_000).nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  startAt: z.string().datetime().nullable().optional(),
  isArchived: z.boolean().optional(),
  /** Optimistic-concurrency guard; if provided and stale, server returns 409. */
  version: z.number().int().optional(),
});

/**
 * Move/reorder a card. The client sends the two neighbours that should
 * surround the card in its new slot; the server computes a fractional index
 * between them. This keeps a move to a single-row write and tolerates
 * concurrent reorders.
 */
export const moveCardSchema = z.object({
  columnId: idSchema,
  swimlaneId: idSchema.optional(),
  prevCardId: idSchema.nullable(),
  nextCardId: idSchema.nullable(),
});

export const cardSchema = z.object({
  id: idSchema,
  boardId: idSchema,
  columnId: idSchema,
  swimlaneId: idSchema,
  number: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  priority: z.enum(PRIORITIES),
  dueAt: z.string().nullable(),
  startAt: z.string().nullable(),
  position: z.string(),
  isArchived: z.boolean(),
  completedAt: z.string().nullable(),
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** A card as rendered on the board: base fields plus lightweight relations. */
export const boardCardSchema = cardSchema.extend({
  labelIds: z.array(idSchema),
  assigneeIds: z.array(idSchema),
  checklistDone: z.number().int(),
  checklistTotal: z.number().int(),
  commentCount: z.number().int(),
  attachmentCount: z.number().int(),
  customFieldValues: z.record(z.string(), z.unknown()),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
export type Card = z.infer<typeof cardSchema>;
export type BoardCard = z.infer<typeof boardCardSchema>;
