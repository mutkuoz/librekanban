import { z } from 'zod';
import { idSchema } from './common';

export const NOTIFICATION_TYPES = ['card.assigned', 'comment.added', 'comment.mention'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notificationSchema = z.object({
  id: idSchema,
  type: z.string(),
  data: z.record(z.string(), z.unknown()),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export type Notification = z.infer<typeof notificationSchema>;
