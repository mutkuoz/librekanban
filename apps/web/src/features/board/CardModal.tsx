import { Button } from '@/components/ui/button';
import { useDeleteCard, useUpdateCard } from '@/lib/queries';
import { type Card, PRIORITIES, type Priority } from '@librekanban/shared';
import * as Dialog from '@radix-ui/react-dialog';
import { Trash2, X } from 'lucide-react';
import { useState } from 'react';

export function CardModal({
  card,
  boardId,
  onClose,
}: {
  card: Card;
  boardId: string;
  onClose: () => void;
}) {
  const update = useUpdateCard(boardId);
  const del = useDeleteCard(boardId);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? '');
  const [priority, setPriority] = useState<Priority>(card.priority);

  const save = async () => {
    await update.mutateAsync({
      cardId: card.id,
      input: { title, description, priority, version: card.version },
    });
    onClose();
  };

  const remove = async () => {
    await del.mutateAsync(card.id);
    onClose();
  };

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-5 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <Dialog.Title className="sr-only">Card #{card.number}</Dialog.Title>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-lg font-semibold outline-none"
            />
            <Dialog.Close className="text-muted hover:text-text">
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="mb-1 text-xs text-muted">#{card.number}</div>

          <label htmlFor="card-desc" className="mb-1 mt-3 block text-xs font-medium text-muted">
            Description
          </label>
          <textarea
            id="card-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Add a description… (markdown supported soon)"
            className="w-full resize-none rounded-md border border-border bg-bg p-2 text-sm outline-none focus:ring-2 focus:ring-brand/60"
          />

          <label htmlFor="card-priority" className="mb-1 mt-3 block text-xs font-medium text-muted">
            Priority
          </label>
          <select
            id="card-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm outline-none"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={remove} disabled={del.isPending}>
              <Trash2 className="size-4" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={save} disabled={update.isPending}>
                Save
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
