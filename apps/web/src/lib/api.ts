import type {
  Board,
  Card,
  Column,
  CreateBoardInput,
  CreateCardInput,
  CreateColumnInput,
  MoveCardInput,
  MoveColumnInput,
  UpdateCardInput,
} from '@librekanban/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'error',
      err?.message ?? `Request failed (${res.status})`,
    );
  }
  return data as T;
}

export interface MeResponse {
  user: { id: string; name: string; email: string; image: string | null };
  workspaces: { id: string; name: string; slug: string; role: string }[];
}

export interface BoardDetail {
  board: Board;
  columns: Column[];
  swimlanes: { id: string; name: string; isDefault: boolean; position: string }[];
  labels: { id: string; name: string; color: string; position: string }[];
  cards: Card[];
}

export const api = {
  me: () => req<MeResponse>('GET', '/me'),
  listBoards: () => req<Board[]>('GET', '/boards'),
  createBoard: (input: CreateBoardInput) => req<Board>('POST', '/boards', input),
  getBoard: (boardId: string) => req<BoardDetail>('GET', `/boards/${boardId}`),

  createColumn: (boardId: string, input: CreateColumnInput) =>
    req<Column>('POST', `/boards/${boardId}/columns`, input),
  moveColumn: (columnId: string, input: MoveColumnInput) =>
    req<Column>('POST', `/columns/${columnId}/move`, input),

  createCard: (input: CreateCardInput) => req<Card>('POST', '/cards', input),
  updateCard: (cardId: string, input: UpdateCardInput) =>
    req<Card>('PATCH', `/cards/${cardId}`, input),
  moveCard: (cardId: string, input: MoveCardInput) =>
    req<Card>('POST', `/cards/${cardId}/move`, input),
  deleteCard: (cardId: string) => req<{ ok: boolean }>('DELETE', `/cards/${cardId}`),
};
