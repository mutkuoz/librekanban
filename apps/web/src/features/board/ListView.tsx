import type { BoardDetail } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { BoardCard, Label, Priority, WorkspaceMember } from '@librekanban/shared';
import { CalendarClock } from 'lucide-react';
import { type BoardFilter, byPosition, matchesFilter } from './filter';

const priorityDot: Record<Priority, string> = {
  none: 'bg-transparent',
  low: 'bg-sky-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};
const initials = (n: string) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');

function Row({
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
  const overdue = card.dueAt && !card.completedAt && new Date(card.dueAt) < new Date();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2"
    >
      <span className={cn('size-2 shrink-0 rounded-full', priorityDot[card.priority])} />
      <span className="w-10 shrink-0 text-xs text-muted">#{card.number}</span>
      <span className="flex-1 truncate">{card.title}</span>
      <div className="flex shrink-0 gap-1">
        {card.labelIds.map((id) => {
          const l = labels.find((x) => x.id === id);
          return l ? (
            <span
              key={id}
              title={l.name}
              className="h-1.5 w-6 rounded-full"
              style={{ backgroundColor: l.color }}
            />
          ) : null;
        })}
      </div>
      {card.dueAt && (
        <span
          className={cn(
            'flex shrink-0 items-center gap-1 text-xs text-muted',
            overdue && 'text-red-400',
          )}
        >
          <CalendarClock className="size-3" />
          {new Date(card.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      )}
      <div className="flex w-16 shrink-0 justify-end -space-x-1.5">
        {card.assigneeIds.map((id) => {
          const m = members.find((x) => x.id === id);
          return m ? (
            <span
              key={id}
              title={m.name}
              className="grid size-5 place-items-center rounded-full border border-surface bg-brand text-[10px] text-brand-fg"
            >
              {initials(m.name)}
            </span>
          ) : null;
        })}
      </div>
    </button>
  );
}

export function ListView({
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
  const cards = detail.cards.filter((c) => matchesFilter(c, filter));
  const columns = [...detail.columns].sort(byPosition);

  return (
    <div className="mx-auto max-w-3xl space-y-5 overflow-y-auto p-4">
      {columns.map((col) => {
        const colCards = cards.filter((c) => c.columnId === col.id).sort(byPosition);
        if (colCards.length === 0) return null;
        return (
          <div key={col.id}>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              {col.name} <span className="text-muted/70">({colCards.length})</span>
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {colCards.map((card) => (
                <Row
                  key={card.id}
                  card={card}
                  labels={detail.labels}
                  members={members}
                  onClick={() => onCardClick(card)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
