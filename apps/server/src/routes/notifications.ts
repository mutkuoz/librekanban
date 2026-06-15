import { createRoute, z } from '@hono/zod-openapi';
import { notificationSchema } from '@librekanban/shared';
import { currentUser } from '../middleware/auth';
import {
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
} from '../services/notification.service';
import { jsonResponse, makeRouter } from './_helpers';

const okSchema = z.object({ ok: z.boolean() });

export const notificationRoutes = makeRouter();

notificationRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/notifications',
    tags: ['Notifications'],
    responses: { 200: jsonResponse(z.array(notificationSchema)) },
  }),
  async (c) => c.json(await listNotifications(c.get('deps').db, currentUser(c).id), 200),
);

notificationRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/notifications/unread-count',
    tags: ['Notifications'],
    responses: { 200: jsonResponse(z.object({ count: z.number().int() })) },
  }),
  async (c) => c.json({ count: await unreadCount(c.get('deps').db, currentUser(c).id) }, 200),
);

notificationRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/notifications/{id}/read',
    tags: ['Notifications'],
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    await markRead(c.get('deps').db, currentUser(c).id, c.req.valid('param').id);
    return c.json({ ok: true }, 200);
  },
);

notificationRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/notifications/read-all',
    tags: ['Notifications'],
    responses: { 200: jsonResponse(okSchema) },
  }),
  async (c) => {
    await markAllRead(c.get('deps').db, currentUser(c).id);
    return c.json({ ok: true }, 200);
  },
);
