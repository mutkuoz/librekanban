import { createRoute, z } from '@hono/zod-openapi';
import { createSavedViewSchema, savedViewSchema } from '@librekanban/shared';
import { currentUser } from '../middleware/auth';
import { createView, deleteView, listViews } from '../services/saved-view.service';
import { jsonBody, jsonResponse, makeRouter } from './_helpers';

const boardParam = z.object({ boardId: z.string() });
const okSchema = z.object({ ok: z.boolean() });

export const savedViewRoutes = makeRouter();

savedViewRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/boards/{boardId}/views',
    tags: ['Views'],
    summary: 'List a board’s saved views',
    request: { params: boardParam },
    responses: { 200: jsonResponse(z.array(savedViewSchema)) },
  }),
  async (c) =>
    c.json(await listViews(c.get('deps'), currentUser(c).id, c.req.valid('param').boardId), 200),
);

savedViewRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/boards/{boardId}/views',
    tags: ['Views'],
    summary: 'Save the current filter + sort as a named view',
    request: { params: boardParam, body: jsonBody(createSavedViewSchema) },
    responses: { 200: jsonResponse(savedViewSchema) },
  }),
  async (c) =>
    c.json(
      await createView(
        c.get('deps'),
        currentUser(c).id,
        c.req.valid('param').boardId,
        c.req.valid('json'),
      ),
      200,
    ),
);

savedViewRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/views/{id}',
    tags: ['Views'],
    summary: 'Delete a saved view',
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    await deleteView(c.get('deps'), currentUser(c).id, c.req.valid('param').id);
    return c.json({ ok: true }, 200);
  },
);
