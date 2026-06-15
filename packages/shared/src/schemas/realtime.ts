import { z } from 'zod';
import { REALTIME_EVENTS } from '../enums';
import { idSchema } from './common';

/**
 * Realtime messages are deliberately "dumb": they carry just enough for a
 * client to invalidate the right query or apply an optimistic patch. They are
 * NOT state diffs — the REST API remains the source of truth.
 */
export const realtimeEventSchema = z.object({
  type: z.enum(REALTIME_EVENTS),
  boardId: idSchema,
  entityId: idSchema.optional(),
  /** Optimistic-concurrency version of the changed entity, when relevant. */
  version: z.number().int().optional(),
  /** Who caused the change (so clients can skip echoing their own action). */
  actorId: idSchema.optional(),
});

export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;

/** Presence list pushed to clients viewing a board. */
export const presenceSchema = z.object({
  boardId: idSchema,
  users: z.array(z.object({ id: idSchema, name: z.string(), avatarUrl: z.string().nullable() })),
});

export type Presence = z.infer<typeof presenceSchema>;

/** Standard error envelope returned by the API. */
export const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ApiError = z.infer<typeof errorSchema>;
