import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useCardActions, useCardDetail, useDeleteCard, useUpdateCard } from '@/lib/queries';
import { cn } from '@/lib/utils';
import {
  type Checklist,
  type Label,
  PRIORITIES,
  type Priority,
  type WorkspaceMember,
} from '@librekanban/shared';
import * as Dialog from '@radix-ui/react-dialog';
import { Check, Loader2, Plus, Trash2, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

const LABEL_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];
const initials = (n: string) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');

export function CardModal({
  cardId,
  boardId,
  labels,
  members,
  onClose,
}: {
  cardId: string;
  boardId: string;
  labels: Label[];
  members: WorkspaceMember[];
  onClose: () => void;
}) {
  const { data: card, isLoading } = useCardDetail(cardId);
  const update = useUpdateCard(boardId);
  const del = useDeleteCard(boardId);
  const action = useCardActions(boardId, cardId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [comment, setComment] = useState('');
  const [newChecklist, setNewChecklist] = useState('');

  // Seed editable fields only when the card identity changes (on open), not on
  // every refetch — otherwise live updates would clobber in-progress edits.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional re-seed on id only
  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description ?? '');
    }
  }, [card?.id]);

  const run = (fn: () => Promise<unknown>) => action.mutate(fn);

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[88vh] w-[94vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-2xl">
          <Dialog.Title className="sr-only">Card details</Dialog.Title>
          {isLoading || !card ? (
            <div className="grid h-40 place-items-center text-muted">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() =>
                    title.trim() &&
                    title !== card.title &&
                    update.mutate({ cardId, input: { title } })
                  }
                  className="w-full bg-transparent text-lg font-semibold outline-none"
                />
                <Dialog.Close className="text-muted hover:text-text">
                  <X className="size-5" />
                </Dialog.Close>
              </div>
              <div className="-mt-3 text-xs text-muted">#{card.number}</div>

              {/* Labels */}
              <section>
                <SectionTitle>Labels</SectionTitle>
                <div className="flex flex-wrap items-center gap-1.5">
                  {labels.map((l) => {
                    const on = card.labelIds.includes(l.id);
                    return (
                      <button
                        type="button"
                        key={l.id}
                        onClick={() =>
                          run(() =>
                            on ? api.removeCardLabel(cardId, l.id) : api.addCardLabel(cardId, l.id),
                          )
                        }
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium transition-opacity',
                          on ? 'opacity-100' : 'opacity-40 hover:opacity-70',
                        )}
                        style={{ backgroundColor: l.color, color: '#0b0e14' }}
                      >
                        {l.name}
                      </button>
                    );
                  })}
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newLabel.trim()) {
                        const color = LABEL_COLORS[labels.length % LABEL_COLORS.length]!;
                        run(() => api.createLabel(boardId, { name: newLabel.trim(), color }));
                        setNewLabel('');
                      }
                    }}
                    placeholder="+ new label"
                    className="h-7 w-24 rounded-full border border-border bg-bg px-2.5 text-xs outline-none focus:ring-2 focus:ring-brand/60"
                  />
                </div>
              </section>

              {/* Assignees */}
              <section>
                <SectionTitle>Assignees</SectionTitle>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => {
                    const on = card.assigneeIds.includes(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() =>
                          run(() =>
                            on ? api.unassignCard(cardId, m.id) : api.assignCard(cardId, m.id),
                          )
                        }
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs',
                          on
                            ? 'border-brand bg-brand/15 text-text'
                            : 'border-border text-muted hover:text-text',
                        )}
                      >
                        <span className="grid size-4 place-items-center rounded-full bg-brand text-[9px] text-brand-fg">
                          {initials(m.name)}
                        </span>
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Due date + priority */}
              <div className="flex flex-wrap gap-6">
                <section>
                  <SectionTitle>Due date</SectionTitle>
                  <input
                    type="date"
                    value={card.dueAt ? card.dueAt.slice(0, 10) : ''}
                    onChange={(e) =>
                      update.mutate({
                        cardId,
                        input: {
                          dueAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                        },
                      })
                    }
                    className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm outline-none"
                  />
                </section>
                <section>
                  <SectionTitle>Priority</SectionTitle>
                  <select
                    value={card.priority}
                    onChange={(e) =>
                      update.mutate({ cardId, input: { priority: e.target.value as Priority } })
                    }
                    className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm outline-none"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </section>
              </div>

              {/* Description */}
              <section>
                <SectionTitle>Description</SectionTitle>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() =>
                    description !== (card.description ?? '') &&
                    update.mutate({ cardId, input: { description } })
                  }
                  rows={4}
                  placeholder="Add more detail…"
                  className="w-full resize-none rounded-md border border-border bg-bg p-2 text-sm outline-none focus:ring-2 focus:ring-brand/60"
                />
              </section>

              {/* Checklists */}
              <section className="space-y-3">
                <SectionTitle>Checklists</SectionTitle>
                {card.checklists.map((cl) => (
                  <ChecklistBlock key={cl.id} checklist={cl} run={run} />
                ))}
                <input
                  value={newChecklist}
                  onChange={(e) => setNewChecklist(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newChecklist.trim()) {
                      run(() => api.createChecklist(cardId, newChecklist.trim()));
                      setNewChecklist('');
                    }
                  }}
                  placeholder="+ add checklist"
                  className="h-8 w-full rounded-md border border-border bg-bg px-2 text-sm outline-none focus:ring-2 focus:ring-brand/60"
                />
              </section>

              {/* Comments */}
              <section className="space-y-3">
                <SectionTitle>Comments</SectionTitle>
                {card.comments.map((cm) => (
                  <div key={cm.id} className="group flex gap-2 text-sm">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-[10px] text-muted">
                      {cm.author ? initials(cm.author.name) : '?'}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cm.author?.name ?? 'Unknown'}</span>
                        <span className="text-xs text-muted">
                          {new Date(cm.createdAt).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => run(() => api.deleteComment(cm.id))}
                          className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Trash2 className="size-3.5 text-muted hover:text-red-400" />
                        </button>
                      </div>
                      <div className="whitespace-pre-wrap text-muted">{cm.body}</div>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={1}
                    placeholder="Write a comment…"
                    className="flex-1 resize-none rounded-md border border-border bg-bg p-2 text-sm outline-none focus:ring-2 focus:ring-brand/60"
                  />
                  <Button
                    size="sm"
                    disabled={!comment.trim()}
                    onClick={() => {
                      run(() => api.createComment(cardId, comment.trim()));
                      setComment('');
                    }}
                  >
                    Send
                  </Button>
                </div>
              </section>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await del.mutateAsync(cardId);
                    onClose();
                  }}
                >
                  <Trash2 className="size-4" /> Delete card
                </Button>
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </div>
  );
}

function ChecklistBlock({
  checklist,
  run,
}: {
  checklist: Checklist;
  run: (fn: () => Promise<unknown>) => void;
}) {
  const [item, setItem] = useState('');
  const done = checklist.items.filter((i) => i.isDone).length;
  return (
    <div className="rounded-md border border-border p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{checklist.title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {done}/{checklist.items.length}
          </span>
          <button type="button" onClick={() => run(() => api.deleteChecklist(checklist.id))}>
            <Trash2 className="size-3.5 text-muted hover:text-red-400" />
          </button>
        </div>
      </div>
      <div className="space-y-1">
        {checklist.items.map((it) => (
          <div key={it.id} className="group flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => run(() => api.updateChecklistItem(it.id, { isDone: !it.isDone }))}
              className={cn(
                'grid size-4 place-items-center rounded border',
                it.isDone ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border',
              )}
            >
              {it.isDone && <Check className="size-3" />}
            </button>
            <span className={cn('flex-1', it.isDone && 'text-muted line-through')}>
              {it.content}
            </span>
            <button
              type="button"
              onClick={() => run(() => api.deleteChecklistItem(it.id))}
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="size-3.5 text-muted hover:text-red-400" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <Plus className="size-3.5 text-muted" />
        <input
          value={item}
          onChange={(e) => setItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && item.trim()) {
              run(() => api.addChecklistItem(checklist.id, item.trim()));
              setItem('');
            }
          }}
          placeholder="Add an item"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </div>
    </div>
  );
}
