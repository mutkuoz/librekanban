import { z } from 'zod';
import { idSchema } from './common';

export const attachmentSchema = z.object({
  id: idSchema,
  cardId: idSchema,
  filename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int(),
  uploadedBy: idSchema.nullable(),
  createdAt: z.string(),
});

export type Attachment = z.infer<typeof attachmentSchema>;
