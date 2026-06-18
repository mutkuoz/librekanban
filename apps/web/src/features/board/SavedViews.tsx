import { useT } from '@/lib/i18n';
import { useSavedViewActions, useSavedViews } from '@/lib/queries';
import type { SortKey } from '@librekanban/shared';
import { Bookmark, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { BoardFilter } from './filter';

export function SavedViews({
  boardId,
  filter,
  sort,
  onApply,
}: {
  boardId: string;
  filter: BoardFilter;
  sort: SortKey;
  onApply: (filter: BoardFilter, sort: SortKey) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { data: views } = useSavedViews(boardId);
  const { create, remove } = useSavedViewActions(boardId);

  const save = () => {
    const name = window.prompt(t('views.namePrompt'));
    if (name?.trim()) create.mutate({ name: name.trim(), filter, sort });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={t('views.title')}
        className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-sm text-muted hover:text-text"
      >
        <Bookmark className="size-4" />
        {t('views.title')}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close views"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="lk-pop absolute right-0 z-20 mt-2 w-60 rounded-md border border-border bg-surface p-1 shadow-xl">
            {(views ?? []).map((v) => (
              <div key={v.id} className="group flex items-center gap-1 rounded hover:bg-surface-2">
                <button
                  type="button"
                  onClick={() => {
                    onApply(v.filter, v.sort);
                    setOpen(false);
                  }}
                  className="flex-1 truncate px-2 py-1.5 text-left text-sm"
                >
                  {v.name}
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate(v.id)}
                  title={t('views.delete')}
                  className="px-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5 text-muted hover:text-red-400" />
                </button>
              </div>
            ))}
            {(!views || views.length === 0) && (
              <div className="px-2 py-1.5 text-sm text-muted">{t('views.none')}</div>
            )}
            <button
              type="button"
              onClick={save}
              className="mt-1 flex w-full items-center gap-1.5 border-t border-border px-2 py-1.5 text-left text-sm text-muted hover:text-text"
            >
              <Plus className="size-3.5" /> {t('views.save')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
