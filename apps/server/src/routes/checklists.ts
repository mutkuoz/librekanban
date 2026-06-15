import { createRoute, z } from '@hono/zod-openapi';
import {
  createChecklistItemSchema,
  createChecklistSchema,
  updateChecklistItemSchema,
} from '@librekanban/shared';
import { currentUser } from '../middleware/auth';
import {
  addChecklistItem,
  createChecklist,
  deleteChecklist,
  deleteChecklistItem,
  updateChecklistItem,
} from '../services/checklist.service';
import { jsonBody, jsonResponse, makeRouter } from './_helpers';

const okSchema = z.object({ ok: z.boolean() });

export const checklistRoutes = makeRouter();

checklistRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/cards/{cardId}/checklists',
    tags: ['Checklists'],
    request: { params: z.object({ cardId: z.string() }), body: jsonBody(createChecklistSchema) },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    const { cardId } = c.req.valid('param');
    await createChecklist(c.get('deps'), currentUser(c).id, cardId, c.req.valid('json'));
    return c.json({ ok: true }, 200);
  },
);

checklistRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/checklists/{checklistId}',
    tags: ['Checklists'],
    request: { params: z.object({ checklistId: z.string() }) },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    const { checklistId } = c.req.valid('param');
    await deleteChecklist(c.get('deps'), currentUser(c).id, checklistId);
    return c.json({ ok: true }, 200);
  },
);

checklistRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/checklists/{checklistId}/items',
    tags: ['Checklists'],
    request: {
      params: z.object({ checklistId: z.string() }),
      body: jsonBody(createChecklistItemSchema),
    },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    const { checklistId } = c.req.valid('param');
    await addChecklistItem(c.get('deps'), currentUser(c).id, checklistId, c.req.valid('json'));
    return c.json({ ok: true }, 200);
  },
);

checklistRoutes.openapi(
  createRoute({
    method: 'patch',
    path: '/checklist-items/{itemId}',
    tags: ['Checklists'],
    request: {
      params: z.object({ itemId: z.string() }),
      body: jsonBody(updateChecklistItemSchema),
    },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    const { itemId } = c.req.valid('param');
    await updateChecklistItem(c.get('deps'), currentUser(c).id, itemId, c.req.valid('json'));
    return c.json({ ok: true }, 200);
  },
);

checklistRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/checklist-items/{itemId}',
    tags: ['Checklists'],
    request: { params: z.object({ itemId: z.string() }) },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    const { itemId } = c.req.valid('param');
    await deleteChecklistItem(c.get('deps'), currentUser(c).id, itemId);
    return c.json({ ok: true }, 200);
  },
);
