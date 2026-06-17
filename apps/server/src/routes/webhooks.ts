import { createRoute, z } from '@hono/zod-openapi';
import {
  createWebhookSchema,
  createdWebhookSchema,
  updateWebhookSchema,
  webhookDeliverySchema,
  webhookSchema,
} from '@librekanban/shared';
import { forbidden } from '../lib/errors';
import { currentUser } from '../middleware/auth';
import {
  createWebhook,
  deleteWebhook,
  listDeliveries,
  listWebhooks,
  updateWebhook,
} from '../services/webhook.service';
import { activeWorkspaceId, jsonBody, jsonResponse, makeRouter } from './_helpers';

const okSchema = z.object({ ok: z.boolean() });

export const webhookRoutes = makeRouter();

webhookRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/webhooks',
    tags: ['Webhooks'],
    responses: { 200: jsonResponse(z.array(webhookSchema)) },
  }),
  async (c) => {
    const deps = c.get('deps');
    const userId = currentUser(c).id;
    const ws = await activeWorkspaceId(c);
    if (!ws) return c.json([], 200);
    return c.json(await listWebhooks(deps, userId, ws), 200);
  },
);

webhookRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/webhooks',
    tags: ['Webhooks'],
    summary: 'Register a webhook (secret returned once)',
    request: { body: jsonBody(createWebhookSchema) },
    responses: { 200: jsonResponse(createdWebhookSchema) },
  }),
  async (c) => {
    const deps = c.get('deps');
    const userId = currentUser(c).id;
    const ws = await activeWorkspaceId(c);
    if (!ws) throw forbidden('You are not a member of any workspace');
    return c.json(await createWebhook(deps, userId, ws, c.req.valid('json')), 200);
  },
);

webhookRoutes.openapi(
  createRoute({
    method: 'patch',
    path: '/webhooks/{id}',
    tags: ['Webhooks'],
    request: { params: z.object({ id: z.string() }), body: jsonBody(updateWebhookSchema) },
    responses: { 200: jsonResponse(webhookSchema) },
  }),
  async (c) =>
    c.json(
      await updateWebhook(
        c.get('deps'),
        currentUser(c).id,
        c.req.valid('param').id,
        c.req.valid('json'),
      ),
      200,
    ),
);

webhookRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/webhooks/{id}',
    tags: ['Webhooks'],
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    await deleteWebhook(c.get('deps'), currentUser(c).id, c.req.valid('param').id);
    return c.json({ ok: true }, 200);
  },
);

webhookRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/webhooks/{id}/deliveries',
    tags: ['Webhooks'],
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: jsonResponse(z.array(webhookDeliverySchema)) },
  }),
  async (c) =>
    c.json(await listDeliveries(c.get('deps'), currentUser(c).id, c.req.valid('param').id), 200),
);
