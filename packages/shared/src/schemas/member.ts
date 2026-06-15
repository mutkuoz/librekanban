import { z } from 'zod';
import { WORKSPACE_ROLES } from '../enums';
import { idSchema } from './common';

export const workspaceMemberSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  role: z.enum(WORKSPACE_ROLES),
});

export type WorkspaceMember = z.infer<typeof workspaceMemberSchema>;
