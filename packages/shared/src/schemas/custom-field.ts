import { z } from 'zod';
import { CUSTOM_FIELD_TYPES } from '../enums';
import { idSchema } from './common';

export const customFieldConfigSchema = z.object({
  /** Options for `select` / `multiselect` types. */
  options: z.array(z.string()).optional(),
});

export const createCustomFieldSchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum(CUSTOM_FIELD_TYPES),
  config: customFieldConfigSchema.optional(),
});

export const updateCustomFieldSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  config: customFieldConfigSchema.optional(),
  isActive: z.boolean().optional(),
});

export const customFieldSchema = z.object({
  id: idSchema,
  boardId: idSchema.nullable(),
  name: z.string(),
  type: z.enum(CUSTOM_FIELD_TYPES),
  config: customFieldConfigSchema,
  position: z.string(),
});

/** Set/clear a card's value for a field (typed payload; null clears it). */
export const setCustomFieldValueSchema = z.object({
  value: z.unknown(),
});

export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;
export type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldSchema>;
export type CustomField = z.infer<typeof customFieldSchema>;
