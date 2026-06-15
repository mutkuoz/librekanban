import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type {
  BoardCard,
  Column as ColumnType,
  Label,
  UpdateColumnInput,
  WorkspaceMember,
} from '@librekanban/shared';
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react';
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
  canEdit,
  onCreateCard,
  onCardClick,
  onUpdateColumn,
  onDeleteColumn,
}: {
  list: BoardList;
  labels: Label[];
  members: WorkspaceMember[];
  canEdit: boolean;
  onCreateCard: (columnId: string, title: string) => void;
  onCardClick: (card: BoardCard) => void;
  onUpdateColumn: (columnId: string, input: UpdateColumnInput) => void;
  onDeleteColumn: (columnId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: list.column.id, data: { type: 'column' } });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState(list.column.name);
  const overLimit = list.column.wipLimit != null && list.cards.length > list.column.wipLimit;

  const submit = () => {
    const t = title.trim();
    if (t) onCreateCard(list.column.id, t);
    setTitle('');
    setAdding(false);
  };

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-xl border border-border bg-surface">
      <header className="flex items-center justify-between px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold">{list.column.name}</span>
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
        {canEdit && (
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="text-muted hover:text-text"
          >
            <MoreHorizontal className="size-4" />
          </button>
        )}
      </header>

      {menuOpen && canEdit && (
        <div className="mx-2 mb-2 space-y-2 rounded-md border border-border bg-bg p-2 text-sm">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() =>
              name.trim() && name !== list.column.name && onUpdateColumn(list.column.id, { name })
            }
            placeholder="Column name"
            className="w-full rounded border border-border bg-surface px-2 py-1 outline-none"
          />
          <label className="flex items-center justify-between gap-2 text-muted">
            WIP limit
            <input
              type="number"
              min={0}
              defaultValue={list.column.wipLimit ?? ''}
              onBlur={(e) =>
                onUpdateColumn(list.column.id, {
                  wipLimit: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-16 rounded border border-border bg-surface px-2 py-1 outline-none"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-muted">
            Done column
            <input
              type="checkbox"
              defaultChecked={list.column.isDoneColumn}
              onChange={(e) => onUpdateColumn(list.column.id, { isDoneColumn: e.target.checked })}
            />
          </label>
          <button
            type="button"
            onClick={() => onDeleteColumn(list.column.id)}
            className="flex items-center gap-1.5 text-red-400 hover:text-red-300"
          >
            <Trash2 className="size-3.5" /> Delete column
          </button>
        </div>
      )}

      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[8px] flex-1 space-y-2 overflow-y-auto px-2 pb-2',
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
              canEdit={canEdit}
              onClick={() => onCardClick(card)}
            />
          ))}
        </SortableContext>
      </div>

      {canEdit &&
        (adding ? (
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
        ))}
    </div>
  );
}
