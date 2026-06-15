import { requireAuth } from '../middleware/auth';
import { makeRouter } from './_helpers';
import { boardRoutes } from './boards';
import { cardRoutes } from './cards';
import { columnRoutes } from './columns';
import { meRoutes } from './me';

/** All authenticated API routes, mounted by the app at `/api`. */
export function createApiRoutes() {
  const api = makeRouter();
  api.use('*', requireAuth);
  api.route('/', meRoutes);
  api.route('/', boardRoutes);
  api.route('/', columnRoutes);
  api.route('/', cardRoutes);
  return api;
}
