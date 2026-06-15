import { Button } from '@/components/ui/button';
import { useBoards, useCreateBoard } from '@/lib/queries';
import { Link } from '@tanstack/react-router';
import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';

export function BoardsListPage() {
  const { data: boards, isLoading } = useBoards();
  const create = useCreateBoard();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const submit = async () => {
    const n = name.trim();
    if (!n) return;
    await create.mutateAsync({ name: n });
    setName('');
    setCreating(false);
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your boards</h1>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New board
          </Button>
        )}
      </div>

      {creating && (
        <div className="mb-6 flex gap-2">
          <input
            // biome-ignore lint/a11y/noAutofocus: focus the new-board name field
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Board name"
            className="h-9 flex-1 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:ring-2 focus:ring-brand/60"
          />
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />} Create
          </Button>
          <Button variant="ghost" onClick={() => setCreating(false)}>
            Cancel
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-muted">Loading…</div>
      ) : boards && boards.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <Link
              key={b.id}
              to="/b/$boardId"
              params={{ boardId: b.id }}
              className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand/60"
            >
              <div className="font-medium">{b.name}</div>
              {b.description && (
                <div className="mt-1 line-clamp-2 text-sm text-muted">{b.description}</div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
          No boards yet. Create your first one.
        </div>
      )}
    </div>
  );
}
