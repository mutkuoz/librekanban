import { createRoute, z } from '@hono/zod-openapi';
import { notificationSchema } from '@librekanban/shared';
import { currentUser } from '../middleware/auth';
import {
  getEmailEnabled,
  listNotifications,
  markAllRead,
  markRead,
  setEmailEnabled,
  unreadCount,
} from '../services/notification.service';
import { activeWorkspaceId, jsonBody, jsonResponse, makeRouter } from './_helpers';

const okSchema = z.object({ ok: z.boolean() });
const prefsSchema = z.object({ emailEnabled: z.boolean() });

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

notificationRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/notification-preferences',
    tags: ['Notifications'],
    responses: { 200: jsonResponse(prefsSchema) },
  }),
  async (c) => {
    const deps = c.get('deps');
    const userId = currentUser(c).id;
    const ws = await activeWorkspaceId(c);
    const emailEnabled = ws ? await getEmailEnabled(deps.db, userId, ws) : true;
    return c.json({ emailEnabled }, 200);
  },
);

notificationRoutes.openapi(
  createRoute({
    method: 'put',
    path: '/notification-preferences',
    tags: ['Notifications'],
    request: { body: jsonBody(prefsSchema) },
    responses: { 200: jsonResponse(prefsSchema) },
  }),
  async (c) => {
    const deps = c.get('deps');
    const userId = currentUser(c).id;
    const ws = await activeWorkspaceId(c);
    const { emailEnabled } = c.req.valid('json');
    if (ws) await setEmailEnabled(deps.db, userId, ws, emailEnabled);
    return c.json({ emailEnabled }, 200);
  },
);
