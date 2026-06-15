import { createRoute, z } from '@hono/zod-openapi';
import {
  createCustomFieldSchema,
  customFieldSchema,
  setCustomFieldValueSchema,
  updateCustomFieldSchema,
} from '@librekanban/shared';
import { currentUser } from '../middleware/auth';
import {
  createCustomField,
  deleteCustomField,
  listCustomFields,
  setCustomFieldValue,
  updateCustomField,
} from '../services/custom-field.service';
import { assertBoardPermission } from '../services/permissions';
import { jsonBody, jsonResponse, makeRouter } from './_helpers';

const okSchema = z.object({ ok: z.boolean() });

export const customFieldRoutes = makeRouter();

customFieldRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/boards/{boardId}/custom-fields',
    tags: ['Custom fields'],
    request: { params: z.object({ boardId: z.string() }) },
    responses: { 200: jsonResponse(z.array(customFieldSchema)) },
  }),
  async (c) => {
    const { boardId } = c.req.valid('param');
    await assertBoardPermission(c.get('deps').db, currentUser(c).id, boardId, 'board:read');
    return c.json(await listCustomFields(c.get('deps').db, boardId), 200);
  },
);

customFieldRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/boards/{boardId}/custom-fields',
    tags: ['Custom fields'],
    request: { params: z.object({ boardId: z.string() }), body: jsonBody(createCustomFieldSchema) },
    responses: { 200: jsonResponse(customFieldSchema) },
  }),
  async (c) => {
    const { boardId } = c.req.valid('param');
    return c.json(
      await createCustomField(c.get('deps'), currentUser(c).id, boardId, c.req.valid('json')),
      200,
    );
  },
);

customFieldRoutes.openapi(
  createRoute({
    method: 'patch',
    path: '/custom-fields/{fieldId}',
    tags: ['Custom fields'],
    request: {
      params: z.object({ fieldId: z.string() }),
      body: jsonBody(updateCustomFieldSchema),
    },
    responses: { 200: jsonResponse(customFieldSchema) },
  }),
  async (c) => {
    const { fieldId } = c.req.valid('param');
    return c.json(
      await updateCustomField(c.get('deps'), currentUser(c).id, fieldId, c.req.valid('json')),
      200,
    );
  },
);

customFieldRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/custom-fields/{fieldId}',
    tags: ['Custom fields'],
    request: { params: z.object({ fieldId: z.string() }) },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    const { fieldId } = c.req.valid('param');
    await deleteCustomField(c.get('deps'), currentUser(c).id, fieldId);
    return c.json({ ok: true }, 200);
  },
);

customFieldRoutes.openapi(
  createRoute({
    method: 'put',
    path: '/cards/{cardId}/custom-fields/{fieldId}',
    tags: ['Custom fields'],
    summary: 'Set or clear a card field value',
    request: {
      params: z.object({ cardId: z.string(), fieldId: z.string() }),
      body: jsonBody(setCustomFieldValueSchema),
    },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    const { cardId, fieldId } = c.req.valid('param');
    await setCustomFieldValue(
      c.get('deps'),
      currentUser(c).id,
      cardId,
      fieldId,
      c.req.valid('json').value,
    );
    return c.json({ ok: true }, 200);
  },
);
