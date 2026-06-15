import { z } from 'zod';
import { idSchema } from './common';

export const createTokenSchema = z.object({
  name: z.string().min(1).max(60),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
});

export const apiTokenSchema = z.object({
  id: idSchema,
  name: z.string(),
  prefix: z.string(),
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
});

/** Returned only at creation — includes the plaintext token (shown once). */
export const createdTokenSchema = apiTokenSchema.extend({ token: z.string() });

export type CreateTokenInput = z.infer<typeof createTokenSchema>;
export type ApiToken = z.infer<typeof apiTokenSchema>;
export type CreatedToken = z.infer<typeof createdTokenSchema>;
