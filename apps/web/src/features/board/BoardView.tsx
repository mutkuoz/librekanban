import type { BoardDetail } from '@/lib/api';
import { useT } from '@/lib/i18n';
import {
  useCreateCard,
  useCreateColumn,
  useDeleteColumn,
  useMoveCard,
  useMoveColumn,
  useUpdateColumn,
} from '@/lib/queries';
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';

/**
 * Prefer the droppable the pointer is actually inside (so dragging over an empty
 * column reliably targets that column, not an adjacent card's nearest corner);
 * fall back to rect intersection when the pointer isn't over any droppable.
 */
const collisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length > 0 ? within : rectIntersection(args);
};
import type { BoardCard, SortKey, WorkspaceMember } from '@librekanban/shared';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type BoardList, Column } from './Column';
import { type BoardFilter, byPosition as byPos, comparatorFor, matchesFilter } from './filter';

function groupLists(detail: BoardDetail, filter: BoardFilter, sort: SortKey): BoardList[] {
  const cmp = comparatorFor(sort);
  return [...detail.columns].sort(byPos).map((column) => ({
    column,
    cards: detail.cards
      .filter((c) => c.columnId === column.id && matchesFilter(c, filter, detail.customFields))
      .sort(cmp),
  }));
}

const containerOf = (lists: BoardList[], id: string): string | undefined =>
  lists.find((l) => l.column.id === id)?.column.id ??
  lists.find((l) => l.cards.some((c) => c.id === id))?.column.id;

export function BoardView({
  detail,
  members,
  filter,
  sort,
  canEdit,
  onCardClick,
}: {
  detail: BoardDetail;
  members: WorkspaceMember[];
  filter: BoardFilter;
  sort: SortKey;
  canEdit: boolean;
  onCardClick: (card: BoardCard) => void;
}) {
  const t = useT();
  const boardId = detail.board.id;
  const moveCard = useMoveCard(boardId);
  const moveColumn = useMoveColumn(boardId);
  const createCard = useCreateCard(boardId);
  const createColumn = useCreateColumn(boardId);
  const updateColumn = useUpdateColumn(boardId);
  const deleteColumn = useDeleteColumn(boardId);
  const [addingCol, setAddingCol] = useState(false);
  const [colName, setColName] = useState('');

  const [lists, setLists] = useState<BoardList[]>(() => groupLists(detail, filter, sort));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'card' | 'column' | null>(null);
  const draggingRef = useRef(false);

  // Re-sync from the server whenever fresh data (or the filter/sort) changes and
  // we're not mid-drag.
  useEffect(() => {
    if (!draggingRef.current) setLists(groupLists(detail, filter, sort));
  }, [detail, filter, sort]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const activeCard = useMemo(
    () =>
      activeType === 'card'
        ? (lists.flatMap((l) => l.cards).find((c) => c.id === activeId) ?? null)
        : null,
    [lists, activeId, activeType],
  );
  const activeColumn = useMemo(
    () => (activeType === 'column' ? (lists.find((l) => l.column.id === activeId) ?? null) : null),
    [lists, activeId, activeType],
  );

  const onDragStart = (e: DragStartEvent) => {
    draggingRef.current = true;
    setActiveId(String(e.active.id));
    setActiveType((e.active.data.current?.type as 'card' | 'column') ?? 'card');
  };

  const onDragOver = (e: DragOverEvent) => {
    if (activeType !== 'card') return; // column reordering settles on drag end
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
    const type = activeType;
    setActiveId(null);
    setActiveType(null);
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Column reorder.
    if (type === 'column') {
      const overColId = containerOf(lists, overIdStr) ?? overIdStr;
      const from = lists.findIndex((l) => l.column.id === activeIdStr);
      const to = lists.findIndex((l) => l.column.id === overColId);
      if (from === -1 || to === -1 || from === to) return;
      const next = arrayMove(lists, from, to);
      setLists(next);
      const i = next.findIndex((l) => l.column.id === activeIdStr);
      moveColumn.mutate({
        columnId: activeIdStr,
        input: {
          prevColumnId: i > 0 ? next[i - 1]!.column.id : null,
          nextColumnId: i < next.length - 1 ? next[i + 1]!.column.id : null,
        },
      });
      return;
    }

    // Card move / reorder.
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
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="h-full overflow-x-auto">
        {/* mx-auto centers the columns when they don't fill the width; w-max lets
            them scroll horizontally once there are many. */}
        <div className="mx-auto flex h-full w-max gap-3 p-4">
          <SortableContext
            items={lists.map((l) => l.column.id)}
            strategy={horizontalListSortingStrategy}
          >
            {lists.map((list) => (
              <Column
                key={list.column.id}
                list={list}
                labels={detail.labels}
                members={members}
                canEdit={canEdit}
                onCardClick={onCardClick}
                onCreateCard={(columnId, title) => createCard.mutate({ columnId, title })}
                onUpdateColumn={(columnId, input) => updateColumn.mutate({ columnId, input })}
                onDeleteColumn={(columnId) => deleteColumn.mutate(columnId)}
              />
            ))}
          </SortableContext>

          {canEdit && (
            <div className="w-72 shrink-0">
              {addingCol ? (
                <div className="space-y-2 rounded-xl border border-border bg-surface p-2">
                  <input
                    // biome-ignore lint/a11y/noAutofocus: focus the new-column field
                    autoFocus
                    value={colName}
                    onChange={(e) => setColName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && colName.trim()) {
                        createColumn.mutate({ name: colName.trim() });
                        setColName('');
                        setAddingCol(false);
                      }
                      if (e.key === 'Escape') setAddingCol(false);
                    }}
                    placeholder={t('board.columnNamePlaceholder')}
                    className="w-full rounded-md border border-border bg-bg p-2 text-sm outline-none focus:ring-2 focus:ring-brand/60"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCol(true)}
                  className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-muted transition-colors hover:border-brand/60 hover:text-text"
                >
                  <Plus className="size-4" /> {t('board.addColumn')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeCard && (
          <div className="w-68 rotate-2 rounded-lg border border-brand/60 bg-surface-2 p-3 text-sm font-medium shadow-2xl">
            {activeCard.title}
          </div>
        )}
        {activeColumn && (
          <div className="w-72 rounded-xl border border-brand/60 bg-surface px-3 py-2.5 text-sm font-semibold shadow-2xl">
            {activeColumn.column.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
