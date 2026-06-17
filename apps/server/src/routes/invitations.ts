import { createRoute, z } from '@hono/zod-openapi';
import {
  acceptInvitationSchema,
  createInvitationSchema,
  invitationSchema,
} from '@librekanban/shared';
import { forbidden } from '../lib/errors';
import { currentUser } from '../middleware/auth';
import {
  acceptInvitation,
  createInvitation,
  listInvitations,
  revokeInvitation,
} from '../services/invitation.service';
import { activeWorkspaceId, jsonBody, jsonResponse, makeRouter } from './_helpers';

const okSchema = z.object({ ok: z.boolean() });

export const invitationRoutes = makeRouter();

invitationRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/invitations',
    tags: ['Workspace'],
    responses: { 200: jsonResponse(z.array(invitationSchema)) },
  }),
  async (c) => {
    const ws = await activeWorkspaceId(c);
    if (!ws) return c.json([], 200);
    return c.json(await listInvitations(c.get('deps'), currentUser(c).id, ws), 200);
  },
);

invitationRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/invitations',
    tags: ['Workspace'],
    summary: 'Invite someone to the active workspace',
    request: { body: jsonBody(createInvitationSchema) },
    responses: { 200: jsonResponse(invitationSchema) },
  }),
  async (c) => {
    const ws = await activeWorkspaceId(c);
    if (!ws) throw forbidden('No active workspace');
    return c.json(
      await createInvitation(c.get('deps'), currentUser(c).id, ws, c.req.valid('json')),
      200,
    );
  },
);

invitationRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/invitations/{id}',
    tags: ['Workspace'],
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    await revokeInvitation(c.get('deps'), currentUser(c).id, c.req.valid('param').id);
    return c.json({ ok: true }, 200);
  },
);

invitationRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/invitations/accept',
    tags: ['Workspace'],
    summary: 'Accept an invitation by token',
    request: { body: jsonBody(acceptInvitationSchema) },
    responses: { 200: jsonResponse(z.object({ workspaceId: z.string() })) },
  }),
  async (c) => {
    const { token } = c.req.valid('json');
    return c.json(await acceptInvitation(c.get('deps'), currentUser(c).id, token), 200);
  },
);
