import { Button } from '@/components/ui/button';
import { getLastBoard } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useBoards, useCreateBoard } from '@/lib/queries';
import { useRouter } from '@tanstack/react-router';
import { LayoutGrid, Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * The index route. Drops the user straight into a board (the last one they
 * opened, else the first), so login lands on real work rather than a list. If
 * there are no boards yet, prompts to create the first one.
 */
export function HomePage() {
  const t = useT();
  const { data: boards, isLoading } = useBoards();
  const create = useCreateBoard();
  const router = useRouter();
  const [name, setName] = useState('');

  useEffect(() => {
    if (!boards || boards.length === 0) return;
    const last = getLastBoard();
    const target = boards.find((b) => b.id === last) ?? boards[0];
    if (!target) return;
    router.navigate({ to: '/b/$boardId', params: { boardId: target.id }, replace: true });
  }, [boards, router]);

  const submit = async () => {
    const n = name.trim();
    if (!n) return;
    const b = await create.mutateAsync({ name: n });
    router.navigate({ to: '/b/$boardId', params: { boardId: b.id } });
  };

  // While boards load, or right before the redirect fires.
  if (isLoading || (boards && boards.length > 0)) {
    return (
      <div className="grid h-full place-items-center text-muted">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  // No boards yet → create the first one.
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-surface-2 text-muted">
          <LayoutGrid className="size-6" />
        </div>
        <div className="mb-4 text-muted">{t('boards.empty')}</div>
        <div className="flex gap-2">
          <input
            // biome-ignore lint/a11y/noAutofocus: focus the field on the empty state
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={t('boards.boardName')}
            className="h-9 flex-1 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:ring-2 focus:ring-brand/60"
          />
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t('boards.newBoard')}
          </Button>
        </div>
      </div>
    </div>
  );
}
