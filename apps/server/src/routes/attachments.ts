import { ApiError } from '../lib/errors';
import { currentUser } from '../middleware/auth';
import { deleteAttachment, getAttachment, uploadAttachment } from '../services/attachment.service';
import { makeRouter } from './_helpers';

// Multipart upload + binary download — plain Hono handlers (not in the OpenAPI doc).
export const attachmentRoutes = makeRouter();

attachmentRoutes.post('/cards/:cardId/attachments', async (c) => {
  const user = currentUser(c);
  const cardId = c.req.param('cardId');
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) {
    throw new ApiError(400, 'no_file', 'Expected a multipart "file" field');
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const dto = await uploadAttachment(c.get('deps'), user.id, cardId, {
    filename: file.name || 'file',
    contentType: file.type || 'application/octet-stream',
    bytes,
  });
  return c.json(dto, 200);
});

attachmentRoutes.get('/attachments/:id', async (c) => {
  const user = currentUser(c);
  const { row, bytes } = await getAttachment(c.get('deps'), user.id, c.req.param('id'));
  return new Response(bytes, {
    status: 200,
    headers: {
      'content-type': row.contentType,
      'content-disposition': `inline; filename="${row.filename.replace(/"/g, '')}"`,
      'cache-control': 'private, max-age=3600',
    },
  });
});

attachmentRoutes.delete('/attachments/:id', async (c) => {
  const user = currentUser(c);
  await deleteAttachment(c.get('deps'), user.id, c.req.param('id'));
  return c.json({ ok: true }, 200);
});
