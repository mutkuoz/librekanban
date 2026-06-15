import type {
  Board,
  BoardCard,
  CardDetail,
  Comment,
  CreateBoardInput,
  CreateCardInput,
  CreateColumnInput,
  CreateLabelInput,
  Label,
  MoveCardInput,
  MoveColumnInput,
  UpdateCardInput,
  WorkspaceMember,
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
  columns: import('@librekanban/shared').Column[];
  swimlanes: { id: string; name: string; isDefault: boolean; position: string }[];
  labels: Label[];
  cards: BoardCard[];
}

export const api = {
  me: () => req<MeResponse>('GET', '/me'),
  members: () => req<WorkspaceMember[]>('GET', '/members'),

  listBoards: () => req<Board[]>('GET', '/boards'),
  createBoard: (input: CreateBoardInput) => req<Board>('POST', '/boards', input),
  getBoard: (boardId: string) => req<BoardDetail>('GET', `/boards/${boardId}`),

  createColumn: (boardId: string, input: CreateColumnInput) =>
    req<import('@librekanban/shared').Column>('POST', `/boards/${boardId}/columns`, input),
  moveColumn: (columnId: string, input: MoveColumnInput) =>
    req<import('@librekanban/shared').Column>('POST', `/columns/${columnId}/move`, input),

  createCard: (input: CreateCardInput) => req<BoardCard>('POST', '/cards', input),
  getCard: (cardId: string) => req<CardDetail>('GET', `/cards/${cardId}`),
  updateCard: (cardId: string, input: UpdateCardInput) =>
    req<BoardCard>('PATCH', `/cards/${cardId}`, input),
  moveCard: (cardId: string, input: MoveCardInput) =>
    req<BoardCard>('POST', `/cards/${cardId}/move`, input),
  deleteCard: (cardId: string) => req<{ ok: boolean }>('DELETE', `/cards/${cardId}`),
  assignCard: (cardId: string, userId: string) =>
    req<{ ok: boolean }>('PUT', `/cards/${cardId}/assignees/${userId}`),
  unassignCard: (cardId: string, userId: string) =>
    req<{ ok: boolean }>('DELETE', `/cards/${cardId}/assignees/${userId}`),

  createLabel: (boardId: string, input: CreateLabelInput) =>
    req<Label>('POST', `/boards/${boardId}/labels`, input),
  deleteLabel: (labelId: string) => req<{ ok: boolean }>('DELETE', `/labels/${labelId}`),
  addCardLabel: (cardId: string, labelId: string) =>
    req<{ ok: boolean }>('PUT', `/cards/${cardId}/labels/${labelId}`),
  removeCardLabel: (cardId: string, labelId: string) =>
    req<{ ok: boolean }>('DELETE', `/cards/${cardId}/labels/${labelId}`),

  createComment: (cardId: string, body: string) =>
    req<Comment>('POST', `/cards/${cardId}/comments`, { body }),
  deleteComment: (commentId: string) => req<{ ok: boolean }>('DELETE', `/comments/${commentId}`),

  createChecklist: (cardId: string, title: string) =>
    req<{ ok: boolean }>('POST', `/cards/${cardId}/checklists`, { title }),
  deleteChecklist: (checklistId: string) =>
    req<{ ok: boolean }>('DELETE', `/checklists/${checklistId}`),
  addChecklistItem: (checklistId: string, content: string) =>
    req<{ ok: boolean }>('POST', `/checklists/${checklistId}/items`, { content }),
  updateChecklistItem: (itemId: string, input: { content?: string; isDone?: boolean }) =>
    req<{ ok: boolean }>('PATCH', `/checklist-items/${itemId}`, input),
  deleteChecklistItem: (itemId: string) =>
    req<{ ok: boolean }>('DELETE', `/checklist-items/${itemId}`),
};
