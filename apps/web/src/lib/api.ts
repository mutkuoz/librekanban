import type {
  Activity,
  ApiToken,
  Attachment,
  Board,
  BoardCard,
  CardDetail,
  Column,
  Comment,
  CreateBoardInput,
  CreateCardInput,
  CreateColumnInput,
  CreateCustomFieldInput,
  CreateLabelInput,
  CreatedToken,
  CustomField,
  Label,
  MoveCardInput,
  MoveColumnInput,
  Notification,
  UpdateCardInput,
  UpdateColumnInput,
  WorkspaceMember,
  WorkspaceRole,
} from '@librekanban/shared';

/** URL for downloading/previewing an attachment (cookie-authed, same origin). */
export const attachmentUrl = (id: string) => `/api/attachments/${id}`;

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
  role: WorkspaceRole;
  columns: Column[];
  swimlanes: { id: string; name: string; isDefault: boolean; position: string }[];
  labels: Label[];
  customFields: CustomField[];
  cards: BoardCard[];
}

export const api = {
  me: () => req<MeResponse>('GET', '/me'),
  members: () => req<WorkspaceMember[]>('GET', '/members'),

  listBoards: () => req<Board[]>('GET', '/boards'),
  createBoard: (input: CreateBoardInput) => req<Board>('POST', '/boards', input),
  getBoard: (boardId: string) => req<BoardDetail>('GET', `/boards/${boardId}`),

  createColumn: (boardId: string, input: CreateColumnInput) =>
    req<Column>('POST', `/boards/${boardId}/columns`, input),
  updateColumn: (columnId: string, input: UpdateColumnInput) =>
    req<Column>('PATCH', `/columns/${columnId}`, input),
  deleteColumn: (columnId: string) => req<{ ok: boolean }>('DELETE', `/columns/${columnId}`),
  moveColumn: (columnId: string, input: MoveColumnInput) =>
    req<Column>('POST', `/columns/${columnId}/move`, input),

  cardActivity: (cardId: string) => req<Activity[]>('GET', `/cards/${cardId}/activity`),

  listNotifications: () => req<Notification[]>('GET', '/notifications'),
  unreadCount: () => req<{ count: number }>('GET', '/notifications/unread-count'),
  markNotificationRead: (id: string) => req<{ ok: boolean }>('POST', `/notifications/${id}/read`),
  markAllNotificationsRead: () => req<{ ok: boolean }>('POST', '/notifications/read-all'),
  notificationPreferences: () => req<{ emailEnabled: boolean }>('GET', '/notification-preferences'),
  setNotificationPreferences: (emailEnabled: boolean) =>
    req<{ emailEnabled: boolean }>('PUT', '/notification-preferences', { emailEnabled }),

  uploadAttachment: async (cardId: string, file: File): Promise<Attachment> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/cards/${cardId}/attachments`, {
      method: 'POST',
      credentials: 'include',
      body: fd,
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new ApiError(res.status, 'upload_failed', data?.error?.message ?? 'Upload failed');
    }
    return res.json() as Promise<Attachment>;
  },
  deleteAttachment: (id: string) => req<{ ok: boolean }>('DELETE', `/attachments/${id}`),

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

  createCustomField: (boardId: string, input: CreateCustomFieldInput) =>
    req<CustomField>('POST', `/boards/${boardId}/custom-fields`, input),
  deleteCustomField: (fieldId: string) =>
    req<{ ok: boolean }>('DELETE', `/custom-fields/${fieldId}`),
  setCustomFieldValue: (cardId: string, fieldId: string, value: unknown) =>
    req<{ ok: boolean }>('PUT', `/cards/${cardId}/custom-fields/${fieldId}`, { value }),

  importCsv: async (file: File, name: string): Promise<{ boardId: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', name);
    return uploadForm('/api/import/csv', fd);
  },
  importTrello: async (file: File): Promise<{ boardId: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    return uploadForm('/api/import/trello', fd);
  },

  listTokens: () => req<ApiToken[]>('GET', '/tokens'),
  createToken: (name: string, expiresInDays?: number) =>
    req<CreatedToken>('POST', '/tokens', { name, expiresInDays }),
  revokeToken: (id: string) => req<{ ok: boolean }>('DELETE', `/tokens/${id}`),
};

async function uploadForm<T>(path: string, fd: FormData): Promise<T> {
  const res = await fetch(path, { method: 'POST', credentials: 'include', body: fd });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new ApiError(res.status, 'upload_failed', data?.error?.message ?? 'Upload failed');
  }
  return res.json() as Promise<T>;
}
