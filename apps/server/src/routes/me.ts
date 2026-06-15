import { createRoute, z } from '@hono/zod-openapi';
import { currentUser } from '../middleware/auth';
import { ensureUserWorkspace, listUserWorkspaces } from '../services/workspace.service';
import { jsonResponse, makeRouter } from './_helpers';

const meResponse = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable(),
  }),
  workspaces: z.array(
    z.object({ id: z.string(), name: z.string(), slug: z.string(), role: z.string() }),
  ),
});

export const meRoutes = makeRouter();

meRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/me',
    tags: ['Account'],
    summary: 'Get the current user and their workspaces',
    responses: { 200: jsonResponse(meResponse) },
  }),
  async (c) => {
    const user = currentUser(c);
    const deps = c.get('deps');
    await ensureUserWorkspace(deps.db, user);
    const workspaces = await listUserWorkspaces(deps.db, user.id);
    return c.json(
      {
        user: { id: user.id, name: user.name, email: user.email, image: user.image ?? null },
        workspaces,
      },
      200,
    );
  },
);
