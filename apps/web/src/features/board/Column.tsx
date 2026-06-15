import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { BoardCard, Column as ColumnType, Label, WorkspaceMember } from '@librekanban/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { CardItem } from './CardItem';

export interface BoardList {
  column: ColumnType;
  cards: BoardCard[];
}

export function Column({
  list,
  labels,
  members,
  onCreateCard,
  onCardClick,
}: {
  list: BoardList;
  labels: Label[];
  members: WorkspaceMember[];
  onCreateCard: (columnId: string, title: string) => void;
  onCardClick: (card: BoardCard) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');

  const submit = () => {
    const t = title.trim();
    if (t) onCreateCard(list.column.id, t);
    setTitle('');
    setAdding(false);
  };
  const { setNodeRef, isOver } = useDroppable({ id: list.column.id, data: { type: 'column' } });
  const overLimit = list.column.wipLimit != null && list.cards.length > list.column.wipLimit;

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-xl border border-border bg-surface">
      <header className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{list.column.name}</span>
          <span
            className={cn(
              'rounded-full bg-surface-2 px-1.5 text-xs text-muted',
              overLimit && 'bg-red-500/20 text-red-400',
            )}
          >
            {list.cards.length}
            {list.column.wipLimit != null && `/${list.column.wipLimit}`}
          </span>
        </div>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 overflow-y-auto px-2 pb-2 min-h-[8px]',
          isOver && 'bg-surface-2/40',
        )}
      >
        <SortableContext items={list.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {list.cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              labels={labels}
              members={members}
              onClick={() => onCardClick(card)}
            />
          ))}
        </SortableContext>
      </div>

      {adding ? (
        <div className="m-2 space-y-2">
          <textarea
            // biome-ignore lint/a11y/noAutofocus: composer should focus when opened
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
              if (e.key === 'Escape') setAdding(false);
            }}
            placeholder="Card title…"
            rows={2}
            className="w-full resize-none rounded-md border border-border bg-bg p-2 text-sm outline-none focus:ring-2 focus:ring-brand/60"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={submit}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="m-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-text"
        >
          <Plus className="size-4" /> Add card
        </button>
      )}
    </div>
  );
}
