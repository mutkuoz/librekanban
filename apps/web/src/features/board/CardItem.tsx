import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, Priority } from '@librekanban/shared';

const priorityDot: Record<Priority, string> = {
  none: '',
  low: 'bg-sky-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

export function CardItem({ card, onClick }: { card: Card; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId: card.columnId },
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg bg-surface-2 border border-border p-3 cursor-grab active:cursor-grabbing hover:border-brand/50 transition-colors',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-start gap-2">
        {card.priority !== 'none' && (
          <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', priorityDot[card.priority])} />
        )}
        <span className="text-sm font-medium leading-snug">{card.title}</span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        <span>#{card.number}</span>
        {card.dueAt && <span>· due {new Date(card.dueAt).toLocaleDateString()}</span>}
        {card.completedAt && <span className="text-emerald-400">· done</span>}
      </div>
    </button>
  );
}
