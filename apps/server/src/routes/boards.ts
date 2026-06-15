import { createRoute, z } from '@hono/zod-openapi';
import {
  boardSchema,
  cardSchema,
  columnSchema,
  createBoardSchema,
  updateBoardSchema,
} from '@librekanban/shared';
import { currentUser } from '../middleware/auth';
import { createBoard, getBoardDetail, listBoards, updateBoard } from '../services/board.service';
import { jsonBody, jsonResponse, makeRouter } from './_helpers';

const boardParam = z.object({ boardId: z.string() });

const boardDetailSchema = z.object({
  board: boardSchema,
  columns: z.array(columnSchema),
  swimlanes: z.array(
    z.object({ id: z.string(), name: z.string(), isDefault: z.boolean(), position: z.string() }),
  ),
  labels: z.array(
    z.object({ id: z.string(), name: z.string(), color: z.string(), position: z.string() }),
  ),
  cards: z.array(cardSchema),
});

export const boardRoutes = makeRouter();

boardRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/boards',
    tags: ['Boards'],
    summary: 'List boards in your workspace',
    responses: { 200: jsonResponse(z.array(boardSchema)) },
  }),
  async (c) => {
    const user = currentUser(c);
    return c.json(await listBoards(c.get('deps'), user.id), 200);
  },
);

boardRoutes.openapi(
  createRoute({
    method: 'post',
    path: '/boards',
    tags: ['Boards'],
    summary: 'Create a board (with starter columns)',
    request: { body: jsonBody(createBoardSchema) },
    responses: { 200: jsonResponse(boardSchema) },
  }),
  async (c) => {
    const user = currentUser(c);
    const body = c.req.valid('json');
    return c.json(await createBoard(c.get('deps'), user.id, body), 200);
  },
);

boardRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/boards/{boardId}',
    tags: ['Boards'],
    summary: 'Get a board with its columns, swimlanes, labels and cards',
    request: { params: boardParam },
    responses: { 200: jsonResponse(boardDetailSchema) },
  }),
  async (c) => {
    const user = currentUser(c);
    const { boardId } = c.req.valid('param');
    return c.json(await getBoardDetail(c.get('deps'), user.id, boardId), 200);
  },
);

boardRoutes.openapi(
  createRoute({
    method: 'patch',
    path: '/boards/{boardId}',
    tags: ['Boards'],
    summary: 'Update a board',
    request: { params: boardParam, body: jsonBody(updateBoardSchema) },
    responses: { 200: jsonResponse(boardSchema) },
  }),
  async (c) => {
    const user = currentUser(c);
    const { boardId } = c.req.valid('param');
    const body = c.req.valid('json');
    return c.json(await updateBoard(c.get('deps'), user.id, boardId, body), 200);
  },
);
