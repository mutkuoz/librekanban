import { currentUser } from '../middleware/auth';
import { exportBoardCsv, exportBoardJson } from '../services/export.service';
import { makeRouter } from './_helpers';

// Board export downloads. Plain Hono handlers (binary-ish, not in OpenAPI doc).
export const exportRoutes = makeRouter();

exportRoutes.get('/boards/:boardId/export', async (c) => {
  const user = currentUser(c);
  const boardId = c.req.param('boardId');
  const csv = c.req.query('format') === 'csv';
  const { filename, body } = csv
    ? await exportBoardCsv(c.get('deps'), user.id, boardId)
    : await exportBoardJson(c.get('deps'), user.id, boardId);
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': csv ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
});
