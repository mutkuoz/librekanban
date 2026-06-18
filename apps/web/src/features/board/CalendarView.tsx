import type { BoardDetail } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { BoardCard } from '@librekanban/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { type BoardFilter, matchesFilter } from './filter';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function CalendarView({
  detail,
  filter,
  onCardClick,
}: {
  detail: BoardDetail;
  filter: BoardFilter;
  onCardClick: (card: BoardCard) => void;
}) {
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const scheduled = detail.cards.filter(
    (c) => matchesFilter(c, filter, detail.customFields) && c.dueAt,
  );
  const byDay = new Map<string, BoardCard[]>();
  for (const c of scheduled) {
    const k = dayKey(new Date(c.dueAt as string));
    const arr = byDay.get(k);
    if (arr) arr.push(c);
    else byDay.set(k, [c]);
  }
  const unscheduled = detail.cards.filter(
    (c) => matchesFilter(c, filter, detail.customFields) && !c.dueAt,
  ).length;

  const year = month.getFullYear();
  const m = month.getMonth();
  const startDow = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells: { key: string; date: Date | null }[] = [];
  for (let i = 0; i < startDow; i++) cells.push({ key: `blank-${i}`, date: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, m, d);
    cells.push({ key: dayKey(date), date });
  }

  const today = dayKey(new Date());

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMonth(new Date(year, m - 1, 1))}
          className="grid size-8 place-items-center rounded-md border border-border text-muted hover:text-text"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="min-w-40 text-center font-medium">
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </div>
        <button
          type="button"
          onClick={() => setMonth(new Date(year, m + 1, 1))}
          className="grid size-8 place-items-center rounded-md border border-border text-muted hover:text-text"
        >
          <ChevronRight className="size-4" />
        </button>
        {unscheduled > 0 && (
          <span className="ml-auto text-xs text-muted">{unscheduled} unscheduled</span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-px text-xs text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid flex-1 auto-rows-fr grid-cols-7 gap-px overflow-y-auto rounded-lg border border-border bg-border">
        {cells.map((cell) => {
          const date = cell.date;
          if (!date) return <div key={cell.key} className="bg-bg" />;
          const k = cell.key;
          const cards = byDay.get(k) ?? [];
          return (
            <div key={k} className="min-h-24 space-y-1 bg-surface p-1.5">
              <div
                className={cn(
                  'text-right text-xs',
                  k === today ? 'font-bold text-brand' : 'text-muted',
                )}
              >
                {date.getDate()}
              </div>
              {cards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onCardClick(c)}
                  className={cn(
                    'block w-full truncate rounded px-1.5 py-0.5 text-left text-xs',
                    c.completedAt
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-surface-2 hover:bg-border',
                  )}
                >
                  {c.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
