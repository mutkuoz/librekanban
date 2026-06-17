import { ApiError, forbidden } from '../lib/errors';
import { currentUser } from '../middleware/auth';
import { importCsv, importTrello } from '../services/importer.service';
import { activeWorkspaceId, makeRouter } from './_helpers';

// File uploads → new board. Plain Hono handlers (multipart, not in OpenAPI doc).
export const importRoutes = makeRouter();

importRoutes.post('/import/csv', async (c) => {
  const user = currentUser(c);
  const ws = await activeWorkspaceId(c);
  if (!ws) throw forbidden('You are not a member of any workspace');
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) throw new ApiError(400, 'no_file', 'Expected a CSV file');
  const name =
    typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Imported board';
  const boardId = await importCsv(c.get('deps'), user.id, ws, await file.text(), name);
  return c.json({ boardId }, 200);
});

importRoutes.post('/import/trello', async (c) => {
  const user = currentUser(c);
  const ws = await activeWorkspaceId(c);
  if (!ws) throw forbidden('You are not a member of any workspace');
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) throw new ApiError(400, 'no_file', 'Expected a Trello JSON file');
  const boardId = await importTrello(c.get('deps'), user.id, ws, await file.text());
  return c.json({ boardId }, 200);
});
