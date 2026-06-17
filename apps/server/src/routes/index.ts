import { requireAuth } from '../middleware/auth';
import { makeRouter } from './_helpers';
import { attachmentRoutes } from './attachments';
import { boardRoutes } from './boards';
import { cardRoutes } from './cards';
import { checklistRoutes } from './checklists';
import { columnRoutes } from './columns';
import { commentRoutes } from './comments';
import { customFieldRoutes } from './custom-fields';
import { exportRoutes } from './export';
import { importRoutes } from './import';
import { labelRoutes } from './labels';
import { meRoutes } from './me';
import { memberRoutes } from './members';
import { notificationRoutes } from './notifications';
import { tokenRoutes } from './tokens';
import { webhookRoutes } from './webhooks';

/** All authenticated API routes, mounted by the app at `/api`. */
export function createApiRoutes() {
  const api = makeRouter();
  api.use('*', requireAuth);
  api.route('/', meRoutes);
  api.route('/', memberRoutes);
  api.route('/', notificationRoutes);
  api.route('/', boardRoutes);
  api.route('/', columnRoutes);
  api.route('/', cardRoutes);
  api.route('/', labelRoutes);
  api.route('/', commentRoutes);
  api.route('/', checklistRoutes);
  api.route('/', attachmentRoutes);
  api.route('/', customFieldRoutes);
  api.route('/', importRoutes);
  api.route('/', exportRoutes);
  api.route('/', tokenRoutes);
  api.route('/', webhookRoutes);
  return api;
}
