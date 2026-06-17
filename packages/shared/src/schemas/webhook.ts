import { z } from 'zod';
import { idSchema } from './common';

export const createWebhookSchema = z.object({
  url: z.string().url(),
  /** Subscribed verbs; omit/empty for all events. */
  events: z.array(z.string()).optional(),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const webhookSchema = z.object({
  id: idSchema,
  url: z.string(),
  events: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.string(),
});

/** Returned only at creation — includes the signing secret (shown once). */
export const createdWebhookSchema = webhookSchema.extend({ secret: z.string() });

export const webhookDeliverySchema = z.object({
  id: idSchema,
  verb: z.string(),
  status: z.string(),
  responseCode: z.number().int().nullable(),
  attempts: z.number().int(),
  createdAt: z.string(),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export type Webhook = z.infer<typeof webhookSchema>;
export type CreatedWebhook = z.infer<typeof createdWebhookSchema>;
export type WebhookDelivery = z.infer<typeof webhookDeliverySchema>;
