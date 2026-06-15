import { z } from 'zod';

/** A ULID identifier (26 chars, Crockford base32). Validated loosely. */
export const idSchema = z.string().min(20).max(40);

/** Hex color like #RRGGBB (used for boards, columns, labels). */
export const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #3b82f6');

export const timestampsSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type Pagination = z.infer<typeof paginationQuerySchema>;
