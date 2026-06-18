import { ImportDialog } from '@/components/ImportDialog';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import { useBoards, useCreateBoard } from '@/lib/queries';
import { Link } from '@tanstack/react-router';
import { LayoutGrid, Loader2, Plus, Upload } from 'lucide-react';
import { useState } from 'react';

export function BoardsListPage() {
  const t = useT();
  const { data: boards, isLoading } = useBoards();
  const create = useCreateBoard();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

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
        <h1 className="text-xl font-semibold">{t('boards.title')}</h1>
        {!creating && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setImporting(true)}>
              <Upload className="size-4" /> {t('boards.import')}
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> {t('boards.newBoard')}
            </Button>
          </div>
        )}
      </div>

      {importing && <ImportDialog onClose={() => setImporting(false)} />}

      {creating && (
        <div className="mb-6 flex gap-2">
          <input
            // biome-ignore lint/a11y/noAutofocus: focus the new-board name field
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={t('boards.boardName')}
            className="h-9 flex-1 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:ring-2 focus:ring-brand/60"
          />
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />} {t('common.create')}
          </Button>
          <Button variant="ghost" onClick={() => setCreating(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-muted">{t('common.loading')}</div>
      ) : boards && boards.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <Link
              key={b.id}
              to="/b/$boardId"
              params={{ boardId: b.id }}
              className="group relative overflow-hidden rounded-xl border border-border bg-surface p-4 pl-5 transition-all hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-lg"
            >
              <span
                className="absolute inset-y-0 left-0 w-1.5"
                style={{ background: b.color ?? 'var(--color-brand)' }}
              />
              <div className="font-medium">{b.name}</div>
              {b.description && (
                <div className="mt-1 line-clamp-2 text-sm text-muted">{b.description}</div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-surface-2 text-muted">
            <LayoutGrid className="size-6" />
          </div>
          <div className="text-muted">{t('boards.empty')}</div>
        </div>
      )}
    </div>
  );
}
