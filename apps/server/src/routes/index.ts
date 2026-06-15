import { requireAuth } from '../middleware/auth';
import { makeRouter } from './_helpers';
import { boardRoutes } from './boards';
import { cardRoutes } from './cards';
import { checklistRoutes } from './checklists';
import { columnRoutes } from './columns';
import { commentRoutes } from './comments';
import { labelRoutes } from './labels';
import { meRoutes } from './me';
import { memberRoutes } from './members';
import { notificationRoutes } from './notifications';

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
  return api;
}
