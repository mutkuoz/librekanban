import { createRoute, z } from '@hono/zod-openapi';
import {
  columnSchema,
  createColumnSchema,
  moveColumnSchema,
  updateColumnSchema,
} from '@librekanban/shared';
import { currentUser } from '../middleware/auth';
import { createColumn, deleteColumn, moveColumn, updateColumn } from '../services/column.service';
import { jsonBody, jsonResponse, makeRouter } from './_helpers';

export const columnRoutes = makeRouter();

columnRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/boards/{boardId}/columns',
    tags: ['Columns'],
    summary: 'Add a column to a board',
    request: { params: z.object({ boardId: z.string() }), body: jsonBody(createColumnSchema) },
    responses: { 200: jsonResponse(columnSchema) },
  }),
  async (c) => {
    const user = currentUser(c);
    const { boardId } = c.req.valid('param');
    return c.json(await createColumn(c.get('deps'), user.id, boardId, c.req.valid('json')), 200);
  },
);

columnRoutes.openapi(
  createRoute({
    method: 'patch',
    path: '/columns/{columnId}',
    tags: ['Columns'],
    summary: 'Update a column',
    request: { params: z.object({ columnId: z.string() }), body: jsonBody(updateColumnSchema) },
    responses: { 200: jsonResponse(columnSchema) },
  }),
  async (c) => {
    const user = currentUser(c);
    const { columnId } = c.req.valid('param');
    return c.json(await updateColumn(c.get('deps'), user.id, columnId, c.req.valid('json')), 200);
  },
);

columnRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/columns/{columnId}/move',
    tags: ['Columns'],
    summary: 'Reorder a column',
    request: { params: z.object({ columnId: z.string() }), body: jsonBody(moveColumnSchema) },
    responses: { 200: jsonResponse(columnSchema) },
  }),
  async (c) => {
    const user = currentUser(c);
    const { columnId } = c.req.valid('param');
    return c.json(await moveColumn(c.get('deps'), user.id, columnId, c.req.valid('json')), 200);
  },
);

columnRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/columns/{columnId}',
    tags: ['Columns'],
    summary: 'Delete a column (and its cards)',
    request: { params: z.object({ columnId: z.string() }) },
    responses: { 200: jsonResponse(z.object({ ok: z.boolean() })) },
  }),
  async (c) => {
    const user = currentUser(c);
    const { columnId } = c.req.valid('param');
    await deleteColumn(c.get('deps'), user.id, columnId);
    return c.json({ ok: true }, 200);
  },
);
