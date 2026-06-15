import { createRoute, z } from '@hono/zod-openapi';
import { apiTokenSchema, createTokenSchema, createdTokenSchema } from '@librekanban/shared';
import { currentUser } from '../middleware/auth';
import { createToken, listTokens, revokeToken } from '../services/token.service';
import { jsonBody, jsonResponse, makeRouter } from './_helpers';

export const tokenRoutes = makeRouter();

tokenRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/tokens',
    tags: ['API tokens'],
    responses: { 200: jsonResponse(z.array(apiTokenSchema)) },
  }),
  async (c) => c.json(await listTokens(c.get('deps').db, currentUser(c).id), 200),
);

tokenRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/tokens',
    tags: ['API tokens'],
    summary: 'Create a personal access token (returned once)',
    request: { body: jsonBody(createTokenSchema) },
    responses: { 200: jsonResponse(createdTokenSchema) },
  }),
  async (c) => {
    const { name, expiresInDays } = c.req.valid('json');
    return c.json(await createToken(c.get('deps').db, currentUser(c).id, name, expiresInDays), 200);
  },
);

tokenRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/tokens/{id}',
    tags: ['API tokens'],
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: jsonResponse(z.object({ ok: z.boolean() })) },
  }),
  async (c) => {
    await revokeToken(c.get('deps').db, currentUser(c).id, c.req.valid('param').id);
    return c.json({ ok: true }, 200);
  },
);
