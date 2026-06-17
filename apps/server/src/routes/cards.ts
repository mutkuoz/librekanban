import { createRoute, z } from '@hono/zod-openapi';
import {
  activitySchema,
  cardDetailSchema,
  cardSchema,
  createCardSchema,
  moveCardSchema,
  updateCardSchema,
} from '@librekanban/shared';
import { currentUser } from '../middleware/auth';
import {
  assignCard,
  createCard,
  deleteCard,
  getCardActivity,
  getCardDetail,
  moveCard,
  unassignCard,
  updateCard,
} from '../services/card.service';
import { addDependency, removeDependency } from '../services/dependency.service';
import { jsonBody, jsonResponse, makeRouter } from './_helpers';

const cardParam = z.object({ cardId: z.string() });
const assigneeParam = z.object({ cardId: z.string(), userId: z.string() });
const dependencyParam = z.object({ cardId: z.string(), blockerId: z.string() });
const okSchema = z.object({ ok: z.boolean() });

export const cardRoutes = makeRouter();

cardRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/cards/{cardId}',
    tags: ['Cards'],
    summary: 'Get a card with comments, checklists and relations',
    request: { params: cardParam },
    responses: { 200: jsonResponse(cardDetailSchema) },
  }),
  async (c) => {
    const { cardId } = c.req.valid('param');
    return c.json(await getCardDetail(c.get('deps'), currentUser(c).id, cardId), 200);
  },
);

cardRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/cards/{cardId}/activity',
    tags: ['Cards'],
    summary: 'Get a card activity/history feed',
    request: { params: cardParam },
    responses: { 200: jsonResponse(z.array(activitySchema)) },
  }),
  async (c) => {
    const { cardId } = c.req.valid('param');
    return c.json(await getCardActivity(c.get('deps'), currentUser(c).id, cardId), 200);
  },
);

cardRoutes.openapi(
  createRoute({
    method: 'put',
    path: '/cards/{cardId}/assignees/{userId}',
    tags: ['Cards'],
    summary: 'Assign a member to a card',
    request: { params: assigneeParam },
    responses: { 200: jsonResponse(z.object({ ok: z.boolean() })) },
  }),
  async (c) => {
    const { cardId, userId } = c.req.valid('param');
    await assignCard(c.get('deps'), currentUser(c).id, cardId, userId);
    return c.json({ ok: true }, 200);
  },
);

cardRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/cards/{cardId}/assignees/{userId}',
    tags: ['Cards'],
    summary: 'Unassign a member from a card',
    request: { params: assigneeParam },
    responses: { 200: jsonResponse(z.object({ ok: z.boolean() })) },
  }),
  async (c) => {
    const { cardId, userId } = c.req.valid('param');
    await unassignCard(c.get('deps'), currentUser(c).id, cardId, userId);
    return c.json({ ok: true }, 200);
  },
);

cardRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/cards/{cardId}/dependencies',
    tags: ['Cards'],
    summary: 'Mark this card as blocked by another card',
    request: { params: cardParam, body: jsonBody(z.object({ blockerId: z.string() })) },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    const { cardId } = c.req.valid('param');
    const { blockerId } = c.req.valid('json');
    await addDependency(c.get('deps'), currentUser(c).id, cardId, blockerId);
    return c.json({ ok: true }, 200);
  },
);

cardRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/cards/{cardId}/dependencies/{blockerId}',
    tags: ['Cards'],
    summary: 'Remove a blocked-by dependency',
    request: { params: dependencyParam },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    const { cardId, blockerId } = c.req.valid('param');
    await removeDependency(c.get('deps'), currentUser(c).id, cardId, blockerId);
    return c.json({ ok: true }, 200);
  },
);

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
