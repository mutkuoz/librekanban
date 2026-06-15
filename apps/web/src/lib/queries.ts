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
