import { createRoute, z } from '@hono/zod-openapi';
import { createLabelSchema, labelSchema, updateLabelSchema } from '@librekanban/shared';
import { currentUser } from '../middleware/auth';
import {
  addLabelToCard,
  createLabel,
  deleteLabel,
  listLabels,
  removeLabelFromCard,
  updateLabel,
} from '../services/label.service';
import { jsonBody, jsonResponse, makeRouter } from './_helpers';

const okSchema = z.object({ ok: z.boolean() });

export const labelRoutes = makeRouter();

labelRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/boards/{boardId}/labels',
    tags: ['Labels'],
    request: { params: z.object({ boardId: z.string() }) },
    responses: { 200: jsonResponse(z.array(labelSchema)) },
  }),
  async (c) => {
    const { boardId } = c.req.valid('param');
    return c.json(await listLabels(c.get('deps'), currentUser(c).id, boardId), 200);
  },
);

labelRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/boards/{boardId}/labels',
    tags: ['Labels'],
    request: { params: z.object({ boardId: z.string() }), body: jsonBody(createLabelSchema) },
    responses: { 200: jsonResponse(labelSchema) },
  }),
  async (c) => {
    const { boardId } = c.req.valid('param');
    return c.json(
      await createLabel(c.get('deps'), currentUser(c).id, boardId, c.req.valid('json')),
      200,
    );
  },
);

labelRoutes.openapi(
  createRoute({
    method: 'patch',
    path: '/labels/{labelId}',
    tags: ['Labels'],
    request: { params: z.object({ labelId: z.string() }), body: jsonBody(updateLabelSchema) },
    responses: { 200: jsonResponse(labelSchema) },
  }),
  async (c) => {
    const { labelId } = c.req.valid('param');
    return c.json(
      await updateLabel(c.get('deps'), currentUser(c).id, labelId, c.req.valid('json')),
      200,
    );
  },
);

labelRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/labels/{labelId}',
    tags: ['Labels'],
    request: { params: z.object({ labelId: z.string() }) },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    const { labelId } = c.req.valid('param');
    await deleteLabel(c.get('deps'), currentUser(c).id, labelId);
    return c.json({ ok: true }, 200);
  },
);

const cardLabelParam = z.object({ cardId: z.string(), labelId: z.string() });

labelRoutes.openapi(
  createRoute({
    method: 'put',
    path: '/cards/{cardId}/labels/{labelId}',
    tags: ['Labels'],
    summary: 'Attach a label to a card',
    request: { params: cardLabelParam },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    const { cardId, labelId } = c.req.valid('param');
    await addLabelToCard(c.get('deps'), currentUser(c).id, cardId, labelId);
    return c.json({ ok: true }, 200);
  },
);

labelRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/cards/{cardId}/labels/{labelId}',
    tags: ['Labels'],
    summary: 'Detach a label from a card',
    request: { params: cardLabelParam },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    const { cardId, labelId } = c.req.valid('param');
    await removeLabelFromCard(c.get('deps'), currentUser(c).id, cardId, labelId);
    return c.json({ ok: true }, 200);
  },
);
