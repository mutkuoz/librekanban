import { z } from 'zod';
import { PRIORITIES } from './card';
import { idSchema } from './common';

/** Sort orders the board/list/calendar views can apply. `manual` = fractional position. */
export const SORT_KEYS = ['manual', 'priority', 'due', 'created', 'title'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/** Due-date buckets a card can be filtered into. */
export const DUE_STATES = ['any', 'overdue', 'today', 'week', 'none'] as const;
export type DueState = (typeof DUE_STATES)[number];

/**
 * The full client-side filter applied to a board's cards. Defined in shared so
 * saved views (server-persisted) can validate the same shape. `z.infer` yields
 * the output type, so every field is present (defaults fill them in).
 */
export const boardFilterSchema = z.object({
  text: z.string().default(''),
  labelId: idSchema.nullable().default(null),
  assigneeId: idSchema.nullable().default(null),
  priorities: z.array(z.enum(PRIORITIES)).default([]),
  due: z.enum(DUE_STATES).default('any'),
  customField: z.object({ fieldId: idSchema, value: z.string() }).nullable().default(null),
});

export type BoardFilter = z.infer<typeof boardFilterSchema>;
