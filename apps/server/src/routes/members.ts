import { createRoute, z } from '@hono/zod-openapi';
import { workspaceMemberSchema } from '@librekanban/shared';
import { currentUser } from '../middleware/auth';
import { primaryWorkspaceId } from '../services/permissions';
import { listWorkspaceMembers } from '../services/workspace.service';
import { jsonResponse, makeRouter } from './_helpers';

export const memberRoutes = makeRouter();

memberRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/members',
    tags: ['Workspace'],
    summary: 'List members of your current workspace',
    responses: { 200: jsonResponse(z.array(workspaceMemberSchema)) },
  }),
  async (c) => {
    const deps = c.get('deps');
    const userId = currentUser(c).id;
    const workspaceId = await primaryWorkspaceId(deps.db, userId);
    if (!workspaceId) return c.json([], 200);
    return c.json(await listWorkspaceMembers(deps.db, workspaceId), 200);
  },
);
