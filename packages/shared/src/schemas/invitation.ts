import { z } from 'zod';
import { WORKSPACE_ROLES } from '../enums';
import { idSchema } from './common';

export const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(WORKSPACE_ROLES).default('member'),
});

export const acceptInvitationSchema = z.object({ token: z.string() });

export const invitationSchema = z.object({
  id: idSchema,
  email: z.string(),
  role: z.enum(WORKSPACE_ROLES),
  token: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type Invitation = z.infer<typeof invitationSchema>;
