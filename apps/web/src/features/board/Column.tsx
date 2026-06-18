import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  BoardCard,
  Column as ColumnType,
  Label,
  UpdateColumnInput,
  WorkspaceMember,
} from '@librekanban/shared';
import { GripVertical, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
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
  const t = useT();
  // The column is both a sortable item (reorder) and a droppable (cards land here).
  const { setNodeRef, attributes, listeners, transform, transition, isDragging, isOver } =
    useSortable({ id: list.column.id, data: { type: 'column' }, disabled: !canEdit });
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState(list.column.name);
  const overLimit = list.column.wipLimit != null && list.cards.length > list.column.wipLimit;

  const submit = () => {
    const value = title.trim();
    if (value) onCreateCard(list.column.id, value);
    setTitle('');
    setAdding(false);
  };

  const commitName = () => {
    if (name.trim() && name !== list.column.name) onUpdateColumn(list.column.id, { name });
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-testid="board-column"
      data-column-name={list.column.name}
      className={cn(
        'flex h-full w-72 shrink-0 flex-col rounded-xl border border-border bg-surface transition-shadow',
        isDragging && 'opacity-60',
        isOver && !isDragging && 'ring-2 ring-brand/50',
      )}
    >
      <header
        {...attributes}
        {...listeners}
        className={cn(
          'flex items-center justify-between px-3 py-2.5',
          canEdit && 'cursor-grab active:cursor-grabbing',
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {canEdit && <GripVertical className="size-3.5 shrink-0 text-muted/50" />}
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
            // Don't let a click on the menu start a column drag.
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMenuOpen((o) => !o)}
            className="text-muted hover:text-text"
          >
            <MoreHorizontal className="size-4" />
          </button>
        )}
      </header>

      {menuOpen && canEdit && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          <div className="lk-pop relative z-20 mx-2 mb-2 space-y-2 rounded-md border border-border bg-bg p-2 text-sm shadow-lg">
            <input
              // biome-ignore lint/a11y/noAutofocus: focus the rename field when the menu opens
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitName();
                  setMenuOpen(false);
                }
                if (e.key === 'Escape') {
                  setName(list.column.name);
                  setMenuOpen(false);
                }
              }}
              onBlur={commitName}
              placeholder={t('column.name')}
              className="w-full rounded border border-border bg-surface px-2 py-1 outline-none focus:ring-2 focus:ring-brand/60"
            />
            <label className="flex items-center justify-between gap-2 text-muted">
              {t('column.wipLimit')}
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
              {t('column.doneColumn')}
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
              <Trash2 className="size-3.5" /> {t('column.deleteColumn')}
            </button>
          </div>
        </>
      )}

      <div
        className={cn(
          'min-h-[8px] flex-1 space-y-2 overflow-y-auto px-2 pb-2 transition-colors',
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
              placeholder={t('column.cardTitle')}
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-bg p-2 text-sm outline-none focus:ring-2 focus:ring-brand/60"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={submit}>
                {t('common.add')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="m-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <Plus className="size-4" /> {t('column.addCard')}
          </button>
        ))}
    </div>
  );
}
