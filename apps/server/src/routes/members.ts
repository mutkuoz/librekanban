import { createRoute, z } from '@hono/zod-openapi';
import { WORKSPACE_ROLES, workspaceMemberSchema } from '@librekanban/shared';
import { forbidden } from '../lib/errors';
import { currentUser } from '../middleware/auth';
import { listWorkspaceMembers, removeMember, setMemberRole } from '../services/workspace.service';
import { activeWorkspaceId, jsonBody, jsonResponse, makeRouter } from './_helpers';

const okSchema = z.object({ ok: z.boolean() });

export const memberRoutes = makeRouter();

memberRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/members',
    tags: ['Workspace'],
    summary: 'List members of the active workspace',
    responses: { 200: jsonResponse(z.array(workspaceMemberSchema)) },
  }),
  async (c) => {
    const ws = await activeWorkspaceId(c);
    if (!ws) return c.json([], 200);
    return c.json(await listWorkspaceMembers(c.get('deps').db, ws), 200);
  },
);

memberRoutes.openapi(
  createRoute({
    method: 'patch',
    path: '/members/{userId}',
    tags: ['Workspace'],
    summary: 'Change a member’s role (owner only)',
    request: {
      params: z.object({ userId: z.string() }),
      body: jsonBody(z.object({ role: z.enum(WORKSPACE_ROLES) })),
    },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    const ws = await activeWorkspaceId(c);
    if (!ws) throw forbidden('No active workspace');
    const { userId } = c.req.valid('param');
    await setMemberRole(c.get('deps').db, currentUser(c).id, ws, userId, c.req.valid('json').role);
    return c.json({ ok: true }, 200);
  },
);

memberRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/members/{userId}',
    tags: ['Workspace'],
    summary: 'Remove a member from the workspace',
    request: { params: z.object({ userId: z.string() }) },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    const ws = await activeWorkspaceId(c);
    if (!ws) throw forbidden('No active workspace');
    await removeMember(c.get('deps').db, currentUser(c).id, ws, c.req.valid('param').userId);
    return c.json({ ok: true }, 200);
  },
);
