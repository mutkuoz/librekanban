import { useBoard, useBoardRealtime } from '@/lib/queries';
import type { Presence } from '@librekanban/shared';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { BoardView } from './BoardView';
import { CardModal } from './CardModal';

function Avatars({ users }: { users: Presence['users'] }) {
  if (users.length === 0) return null;
  return (
    <div className="flex -space-x-2">
      {users.slice(0, 5).map((u) => (
        <div
          key={u.id}
          title={u.name}
          className="grid size-7 place-items-center rounded-full border border-bg bg-brand text-xs font-medium text-brand-fg"
        >
          {u.name.charAt(0).toUpperCase()}
        </div>
      ))}
    </div>
  );
}

export function BoardPage({ boardId }: { boardId: string }) {
  const { data, isLoading, error } = useBoard(boardId);
  const presence = useBoardRealtime(boardId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading)
    return <div className="grid h-full place-items-center text-muted">Loading board…</div>;
  if (error || !data)
    return (
      <div className="grid h-full place-items-center text-muted">Couldn't load this board.</div>
    );

  const selected = selectedId ? (data.cards.find((c) => c.id === selectedId) ?? null) : null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm text-muted hover:text-text">
            ← Boards
          </Link>
          <h1 className="font-semibold">{data.board.name}</h1>
        </div>
        <Avatars users={presence} />
      </header>
      <div className="min-h-0 flex-1">
        <BoardView detail={data} onCardClick={(c) => setSelectedId(c.id)} />
      </div>
      {selected && (
        <CardModal card={selected} boardId={boardId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
