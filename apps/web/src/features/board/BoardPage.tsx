import { useBoard, useBoardRealtime, useMembers } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { type Presence, type SortKey, can } from '@librekanban/shared';
import { Link } from '@tanstack/react-router';
import { Download, Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { BoardView } from './BoardView';
import { CalendarView } from './CalendarView';
import { CardModal } from './CardModal';
import { CustomFieldsDialog } from './CustomFieldsDialog';
import { FilterPanel } from './FilterPanel';
import { ListView } from './ListView';
import { type BoardFilter, EMPTY_FILTER } from './filter';

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
  const { data: members } = useMembers();
  const presence = useBoardRealtime(boardId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [view, setView] = useState<'board' | 'list' | 'calendar'>('board');
  const [filter, setFilter] = useState<BoardFilter>(EMPTY_FILTER);
  const [sort, setSort] = useState<SortKey>('manual');

  if (isLoading)
    return <div className="grid h-full place-items-center text-muted">Loading board…</div>;
  if (error || !data)
    return (
      <div className="grid h-full place-items-center text-muted">Couldn't load this board.</div>
    );

  const memberList = members ?? [];
  const canEdit = can(data.role, 'card:create');
  const canManageFields = can(data.role, 'customField:manage');
  const selectCls = 'h-8 rounded-md border border-border bg-surface px-2 text-sm outline-none';

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm text-muted hover:text-text">
            ← Boards
          </Link>
          <h1 className="font-semibold">{data.board.name}</h1>
          <div className="flex rounded-md border border-border bg-surface p-0.5 text-sm">
            {(['board', 'list', 'calendar'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  'rounded px-2.5 py-1 capitalize',
                  view === v ? 'bg-surface-2 text-text' : 'text-muted hover:text-text',
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2">
            <Search className="size-3.5 text-muted" />
            <input
              value={filter.text}
              onChange={(e) => setFilter((f) => ({ ...f, text: e.target.value }))}
              placeholder="Search cards"
              className="h-8 w-36 bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={filter.labelId ?? ''}
            onChange={(e) => setFilter((f) => ({ ...f, labelId: e.target.value || null }))}
            className={selectCls}
          >
            <option value="">All labels</option>
            {data.labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            value={filter.assigneeId ?? ''}
            onChange={(e) => setFilter((f) => ({ ...f, assigneeId: e.target.value || null }))}
            className={selectCls}
          >
            <option value="">Anyone</option>
            {memberList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <FilterPanel
            filter={filter}
            setFilter={setFilter}
            sort={sort}
            setSort={setSort}
            customFields={data.customFields}
            members={memberList}
          />
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              title="Export"
              className="grid size-8 place-items-center rounded-md border border-border bg-surface text-muted hover:text-text"
            >
              <Download className="size-4" />
            </button>
            {exportOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close export menu"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-40 rounded-md border border-border bg-surface p-1 shadow-xl">
                  <a
                    href={`/api/boards/${boardId}/export?format=json`}
                    onClick={() => setExportOpen(false)}
                    className="block rounded px-2 py-1.5 text-sm hover:bg-surface-2"
                  >
                    Export JSON
                  </a>
                  <a
                    href={`/api/boards/${boardId}/export?format=csv`}
                    onClick={() => setExportOpen(false)}
                    className="block rounded px-2 py-1.5 text-sm hover:bg-surface-2"
                  >
                    Export CSV
                  </a>
                </div>
              </>
            )}
          </div>
          {canManageFields && (
            <button
              type="button"
              onClick={() => setFieldsOpen(true)}
              title="Custom fields"
              className="grid size-8 place-items-center rounded-md border border-border bg-surface text-muted hover:text-text"
            >
              <SlidersHorizontal className="size-4" />
            </button>
          )}
          <Avatars users={presence} />
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {view === 'board' && (
          <BoardView
            detail={data}
            members={memberList}
            filter={filter}
            sort={sort}
            canEdit={canEdit}
            onCardClick={(c) => setSelectedId(c.id)}
          />
        )}
        {view === 'list' && (
          <ListView
            detail={data}
            members={memberList}
            filter={filter}
            sort={sort}
            onCardClick={(c) => setSelectedId(c.id)}
          />
        )}
        {view === 'calendar' && (
          <CalendarView detail={data} filter={filter} onCardClick={(c) => setSelectedId(c.id)} />
        )}
      </div>

      {selectedId && (
        <CardModal
          cardId={selectedId}
          boardId={boardId}
          labels={data.labels}
          members={memberList}
          customFields={data.customFields}
          onClose={() => setSelectedId(null)}
        />
      )}

      {fieldsOpen && (
        <CustomFieldsDialog
          boardId={boardId}
          fields={data.customFields}
          onClose={() => setFieldsOpen(false)}
        />
      )}
    </div>
  );
}
