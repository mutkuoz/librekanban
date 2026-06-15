import { createRoute, z } from '@hono/zod-openapi';
import { commentSchema, createCommentSchema } from '@librekanban/shared';
import { currentUser } from '../middleware/auth';
import { createComment, deleteComment, listComments } from '../services/comment.service';
import { jsonBody, jsonResponse, makeRouter } from './_helpers';

export const commentRoutes = makeRouter();

commentRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/cards/{cardId}/comments',
    tags: ['Comments'],
    request: { params: z.object({ cardId: z.string() }) },
    responses: { 200: jsonResponse(z.array(commentSchema)) },
  }),
  async (c) => {
    const { cardId } = c.req.valid('param');
    return c.json(await listComments(c.get('deps'), currentUser(c).id, cardId), 200);
  },
);

commentRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/cards/{cardId}/comments',
    tags: ['Comments'],
    request: { params: z.object({ cardId: z.string() }), body: jsonBody(createCommentSchema) },
    responses: { 200: jsonResponse(commentSchema) },
  }),
  async (c) => {
    const { cardId } = c.req.valid('param');
    return c.json(
      await createComment(c.get('deps'), currentUser(c).id, cardId, c.req.valid('json')),
      200,
    );
  },
);

commentRoutes.openapi(
  createRoute({
    method: 'delete',
    path: '/comments/{commentId}',
    tags: ['Comments'],
    request: { params: z.object({ commentId: z.string() }) },
    responses: { 200: jsonResponse(z.object({ ok: z.boolean() })) },
  }),
  async (c) => {
    const { commentId } = c.req.valid('param');
    await deleteComment(c.get('deps'), currentUser(c).id, commentId);
    return c.json({ ok: true }, 200);
  },
);
