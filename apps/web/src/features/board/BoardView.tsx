import type { BoardDetail } from '@/lib/api';
import { useCreateCard, useMoveCard } from '@/lib/queries';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { BoardCard, WorkspaceMember } from '@librekanban/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type BoardList, Column } from './Column';

export interface BoardFilter {
  text: string;
  labelId: string | null;
  assigneeId: string | null;
}

const byPos = <T extends { position: string }>(a: T, b: T) =>
  a.position < b.position ? -1 : a.position > b.position ? 1 : 0;

function matches(card: BoardCard, filter: BoardFilter): boolean {
  if (filter.labelId && !card.labelIds.includes(filter.labelId)) return false;
  if (filter.assigneeId && !card.assigneeIds.includes(filter.assigneeId)) return false;
  if (filter.text) {
    const q = filter.text.toLowerCase();
    if (!card.title.toLowerCase().includes(q) && !`#${card.number}`.includes(q)) return false;
  }
  return true;
}

function groupLists(detail: BoardDetail, filter: BoardFilter): BoardList[] {
  return [...detail.columns].sort(byPos).map((column) => ({
    column,
    cards: detail.cards.filter((c) => c.columnId === column.id && matches(c, filter)).sort(byPos),
  }));
}

const containerOf = (lists: BoardList[], id: string): string | undefined =>
  lists.find((l) => l.column.id === id)?.column.id ??
  lists.find((l) => l.cards.some((c) => c.id === id))?.column.id;

export function BoardView({
  detail,
  members,
  filter,
  onCardClick,
}: {
  detail: BoardDetail;
  members: WorkspaceMember[];
  filter: BoardFilter;
  onCardClick: (card: BoardCard) => void;
}) {
  const boardId = detail.board.id;
  const moveCard = useMoveCard(boardId);
  const createCard = useCreateCard(boardId);

  const [lists, setLists] = useState<BoardList[]>(() => groupLists(detail, filter));
  const [activeId, setActiveId] = useState<string | null>(null);
  const draggingRef = useRef(false);

  // Re-sync from the server whenever fresh data (or the filter) changes and
  // we're not mid-drag.
  useEffect(() => {
    if (!draggingRef.current) setLists(groupLists(detail, filter));
  }, [detail, filter]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const activeCard = useMemo(
    () => lists.flatMap((l) => l.cards).find((c) => c.id === activeId) ?? null,
    [lists, activeId],
  );

  const onDragStart = (e: DragStartEvent) => {
    draggingRef.current = true;
    setActiveId(String(e.active.id));
  };

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const from = containerOf(lists, activeIdStr);
    const to = containerOf(lists, overIdStr);
    if (!from || !to || from === to) return;

    setLists((prev) => {
      const fromList = prev.find((l) => l.column.id === from);
      const toList = prev.find((l) => l.column.id === to);
      const moving = fromList?.cards.find((c) => c.id === activeIdStr);
      if (!fromList || !toList || !moving) return prev;
      let overIndex = toList.cards.findIndex((c) => c.id === overIdStr);
      if (overIndex === -1) overIndex = toList.cards.length;
      const nextTo = [...toList.cards];
      nextTo.splice(overIndex, 0, { ...moving, columnId: to });
      return prev.map((l) =>
        l.column.id === from
          ? { ...l, cards: l.cards.filter((c) => c.id !== activeIdStr) }
          : l.column.id === to
            ? { ...l, cards: nextTo }
            : l,
      );
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    draggingRef.current = false;
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    let persist: Parameters<typeof moveCard.mutate>[0] | null = null;
    setLists((prev) => {
      const to = containerOf(prev, overIdStr);
      if (!to) return prev;
      const list = prev.find((l) => l.column.id === to);
      if (!list) return prev;
      const oldIndex = list.cards.findIndex((c) => c.id === activeIdStr);
      let overIndex = list.cards.findIndex((c) => c.id === overIdStr);
      if (overIndex === -1) overIndex = list.cards.length - 1;
      const cards =
        oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex
          ? arrayMove(list.cards, oldIndex, overIndex)
          : list.cards;
      const i = cards.findIndex((c) => c.id === activeIdStr);
      persist = {
        cardId: activeIdStr,
        input: {
          columnId: to,
          prevCardId: i > 0 ? cards[i - 1]!.id : null,
          nextCardId: i < cards.length - 1 ? cards[i + 1]!.id : null,
        },
      };
      return prev.map((l) => (l.column.id === to ? { ...l, cards } : l));
    });
    if (persist) moveCard.mutate(persist);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full gap-3 overflow-x-auto p-4">
        {lists.map((list) => (
          <Column
            key={list.column.id}
            list={list}
            labels={detail.labels}
            members={members}
            onCardClick={onCardClick}
            onCreateCard={(columnId, title) => createCard.mutate({ columnId, title })}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard && (
          <div className="w-68 rounded-lg border border-brand/60 bg-surface-2 p-3 text-sm font-medium shadow-xl">
            {activeCard.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
