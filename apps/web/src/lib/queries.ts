import type { Presence } from '@librekanban/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from './api';
import { subscribeToBoard } from './ws';

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });

export const useBoards = () => useQuery({ queryKey: ['boards'], queryFn: api.listBoards });

export const useBoard = (boardId: string) =>
  useQuery({ queryKey: ['board', boardId], queryFn: () => api.getBoard(boardId) });

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createBoard,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  });
}

const invalidateBoard = (qc: ReturnType<typeof useQueryClient>, boardId: string) =>
  qc.invalidateQueries({ queryKey: ['board', boardId] });

export function useCreateCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createCard,
    onSuccess: () => invalidateBoard(qc, boardId),
  });
}

export function useUpdateCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { cardId: string; input: Parameters<typeof api.updateCard>[1] }) =>
      api.updateCard(vars.cardId, vars.input),
    onSuccess: () => invalidateBoard(qc, boardId),
  });
}

export function useDeleteCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteCard,
    onSuccess: () => invalidateBoard(qc, boardId),
  });
}

export function useMoveCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { cardId: string; input: Parameters<typeof api.moveCard>[1] }) =>
      api.moveCard(vars.cardId, vars.input),
    // Resync on settle (success or failure) so the board reflects the server.
    onSettled: () => invalidateBoard(qc, boardId),
  });
}

export function useCreateColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof api.createColumn>[1]) => api.createColumn(boardId, input),
    onSuccess: () => invalidateBoard(qc, boardId),
  });
}

export function useMembers() {
  return useQuery({ queryKey: ['members'], queryFn: api.members });
}

export function useCardDetail(cardId: string | null) {
  return useQuery({
    queryKey: ['card', cardId],
    queryFn: () => api.getCard(cardId as string),
    enabled: cardId != null,
  });
}

/**
 * One mutation for all card-content actions (labels, assignees, comments,
 * checklists). Pass the api call to run; it invalidates both the board and the
 * open card on success.
 */
export function useCardActions(boardId: string, cardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['board', boardId] }),
        qc.invalidateQueries({ queryKey: ['card', cardId] }),
      ]),
  });
}

export function useUpdateColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { columnId: string; input: Parameters<typeof api.updateColumn>[1] }) =>
      api.updateColumn(v.columnId, v.input),
    onSuccess: () => invalidateBoard(qc, boardId),
  });
}

export function useDeleteColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteColumn,
    onSuccess: () => invalidateBoard(qc, boardId),
  });
}

export function useCustomFieldAdmin(boardId: string) {
  const qc = useQueryClient();
  const invalidate = () => invalidateBoard(qc, boardId);
  return {
    create: useMutation({
      mutationFn: (input: Parameters<typeof api.createCustomField>[1]) =>
        api.createCustomField(boardId, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: api.deleteCustomField, onSuccess: invalidate }),
  };
}

export function useCardActivity(cardId: string | null) {
  return useQuery({
    queryKey: ['card-activity', cardId],
    queryFn: () => api.cardActivity(cardId as string),
    enabled: cardId != null,
  });
}

export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: api.listNotifications });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['unreadCount'],
    queryFn: api.unreadCount,
    refetchInterval: 20_000,
  });
}

export function useTokens() {
  return useQuery({ queryKey: ['tokens'], queryFn: api.listTokens });
}

export function useTokenActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tokens'] });
  return {
    create: useMutation({
      mutationFn: (v: { name: string; expiresInDays?: number }) =>
        api.createToken(v.name, v.expiresInDays),
      onSuccess: invalidate,
    }),
    revoke: useMutation({ mutationFn: (id: string) => api.revokeToken(id), onSuccess: invalidate }),
  };
}

export function useWebhooks() {
  return useQuery({ queryKey: ['webhooks'], queryFn: api.listWebhooks });
}

export function useWebhookActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['webhooks'] });
  return {
    create: useMutation({
      mutationFn: (input: Parameters<typeof api.createWebhook>[0]) => api.createWebhook(input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.deleteWebhook(id),
      onSuccess: invalidate,
    }),
  };
}

export function useNotificationPreferences() {
  return useQuery({ queryKey: ['prefs'], queryFn: api.notificationPreferences });
}

export function useSetNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (emailEnabled: boolean) => api.setNotificationPreferences(emailEnabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prefs'] }),
  });
}

export function useNotificationActions() {
  const qc = useQueryClient();
  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['notifications'] }),
      qc.invalidateQueries({ queryKey: ['unreadCount'] }),
    ]);
  return {
    markRead: useMutation({ mutationFn: api.markNotificationRead, onSuccess: invalidate }),
    markAll: useMutation({ mutationFn: api.markAllNotificationsRead, onSuccess: invalidate }),
  };
}

/** Subscribe to live board updates; returns the current presence list. */
export function useBoardRealtime(boardId: string): Presence['users'] {
  const qc = useQueryClient();
  const [presence, setPresence] = useState<Presence['users']>([]);
  useEffect(() => {
    const dispose = subscribeToBoard(boardId, {
      onEvent: (event) => {
        invalidateBoard(qc, boardId);
        if (event.entityId) qc.invalidateQueries({ queryKey: ['card', event.entityId] });
      },
      onPresence: setPresence,
    });
    return dispose;
  }, [boardId, qc]);
  return presence;
}
