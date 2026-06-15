import { createRoute, z } from '@hono/zod-openapi';
import {
  cardSchema,
  createCardSchema,
  moveCardSchema,
  updateCardSchema,
} from '@librekanban/shared';
import { currentUser } from '../middleware/auth';
import { createCard, deleteCard, moveCard, updateCard } from '../services/card.service';
import { jsonBody, jsonResponse, makeRouter } from './_helpers';

const cardParam = z.object({ cardId: z.string() });

export const cardRoutes = makeRouter();

cardRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/cards',
    tags: ['Cards'],
    summary: 'Create a card',
    request: { body: jsonBody(createCardSchema) },
    responses: { 200: jsonResponse(cardSchema) },
  }),
  async (c) => {
    const user = currentUser(c);
    return c.json(await createCard(c.get('deps'), user.id, c.req.valid('json')), 200);
  },
);

cardRoutes.openapi(
  createRoute({
    method: 'patch',
    path: '/cards/{cardId}',
    tags: ['Cards'],
    summary: 'Update a card',
    request: { params: cardParam, body: jsonBody(updateCardSchema) },
    responses: { 200: jsonResponse(cardSchema) },
  }),
  async (c) => {
    const user = currentUser(c);
    const { cardId } = c.req.valid('param');
    return c.json(await updateCard(c.get('deps'), user.id, cardId, c.req.valid('json')), 200);
  },
);

cardRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/cards/{cardId}/move',
    tags: ['Cards'],
    summary: 'Move/reorder a card',
    request: { params: cardParam, body: jsonBody(moveCardSchema) },
    responses: { 200: jsonResponse(cardSchema) },
  }),
  async (c) => {
    const user = currentUser(c);
    const { cardId } = c.req.valid('param');
    return c.json(await moveCard(c.get('deps'), user.id, cardId, c.req.valid('json')), 200);
  },
);

cardRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/cards/{cardId}',
    tags: ['Cards'],
    summary: 'Delete a card',
    request: { params: cardParam },
    responses: { 200: jsonResponse(z.object({ ok: z.boolean() })) },
  }),
  async (c) => {
    const user = currentUser(c);
    const { cardId } = c.req.valid('param');
    await deleteCard(c.get('deps'), user.id, cardId);
    return c.json({ ok: true }, 200);
  },
);
