import { z } from 'zod';
import { ACTIVITY_VERBS } from '../enums';
import { idSchema } from './common';

/** A card/board activity entry, as shown in the history panel. */
export const activitySchema = z.object({
  id: idSchema,
  verb: z.enum(ACTIVITY_VERBS),
  actorName: z.string().nullable(),
  data: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});

export type Activity = z.infer<typeof activitySchema>;
