import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BoardCard, Label, Priority, WorkspaceMember } from '@librekanban/shared';
import { CalendarClock, CheckSquare, MessageSquare } from 'lucide-react';

const priorityDot: Record<Priority, string> = {
  none: '',
  low: 'bg-sky-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

export function CardItem({
  card,
  labels,
  members,
  onClick,
}: {
  card: BoardCard;
  labels: Label[];
  members: WorkspaceMember[];
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId: card.columnId },
  });

  const cardLabels = card.labelIds
    .map((id) => labels.find((l) => l.id === id))
    .filter((l): l is Label => Boolean(l));
  const assignees = card.assigneeIds
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is WorkspaceMember => Boolean(m));
  const overdue = card.dueAt && !card.completedAt && new Date(card.dueAt) < new Date();

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'w-full space-y-2 rounded-lg border border-border bg-surface-2 p-3 text-left transition-colors hover:border-brand/50 active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
    >
      {cardLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {cardLabels.map((l) => (
            <span
              key={l.id}
              title={l.name}
              className="h-1.5 w-8 rounded-full"
              style={{ backgroundColor: l.color }}
            />
          ))}
        </div>
      )}

      <div className="flex items-start gap-2">
        {card.priority !== 'none' && (
          <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', priorityDot[card.priority])} />
        )}
        <span className="text-sm font-medium leading-snug">{card.title}</span>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <div className="flex items-center gap-2.5">
          <span>#{card.number}</span>
          {card.dueAt && (
            <span className={cn('flex items-center gap-1', overdue && 'text-red-400')}>
              <CalendarClock className="size-3" />
              {new Date(card.dueAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
          {card.checklistTotal > 0 && (
            <span
              className={cn(
                'flex items-center gap-1',
                card.checklistDone === card.checklistTotal && 'text-emerald-400',
              )}
            >
              <CheckSquare className="size-3" />
              {card.checklistDone}/{card.checklistTotal}
            </span>
          )}
          {card.commentCount > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3" />
              {card.commentCount}
            </span>
          )}
        </div>
        {assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {assignees.slice(0, 3).map((m) => (
              <span
                key={m.id}
                title={m.name}
                className="grid size-5 place-items-center rounded-full border border-surface-2 bg-brand text-[10px] font-medium text-brand-fg"
              >
                {initials(m.name)}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
