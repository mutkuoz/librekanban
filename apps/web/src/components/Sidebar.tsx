import { ImportDialog } from '@/components/ImportDialog';
import { NotificationBell } from '@/components/NotificationBell';
import { getActiveWorkspace, setActiveWorkspace } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { useBoards, useCreateBoard, useMe } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useRouter, useRouterState } from '@tanstack/react-router';
import { LogOut, PanelLeftClose, Plus, Settings, SquareKanban, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Sidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const t = useT();
  const { data: me } = useMe();
  const { data: boards } = useBoards();
  const createBoard = useCreateBoard();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [activeWs, setActiveWsState] = useState<string | null>(getActiveWorkspace);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [importing, setImporting] = useState(false);

  const workspaces = me?.workspaces ?? [];

  // Keep the active workspace valid (falls back to the primary).
  useEffect(() => {
    const primary = workspaces[0];
    if (!primary) return;
    if (!activeWs || !workspaces.some((w) => w.id === activeWs)) {
      setActiveWorkspace(primary.id);
      setActiveWsState(primary.id);
    }
  }, [workspaces, activeWs]);

  const onSwitchWorkspace = async (id: string) => {
    setActiveWorkspace(id);
    setActiveWsState(id);
    await qc.invalidateQueries();
    onClose();
    router.navigate({ to: '/' });
  };

  const onSignOut = async () => {
    await signOut();
    await qc.invalidateQueries();
    onClose();
    router.navigate({ to: '/' });
  };

  const createNew = async () => {
    const name = newName.trim();
    if (!name) return;
    const board = await createBoard.mutateAsync({ name });
    setNewName('');
    setAdding(false);
    onClose();
    router.navigate({ to: '/b/$boardId', params: { boardId: board.id } });
  };

  return (
    <>
      {/* Mobile backdrop. */}
      {open && (
        <button
          type="button"
          aria-label={t('common.close')}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-surface transition-transform',
          open ? 'translate-x-0' : '-translate-x-full',
          // On desktop: a static rail, or hidden when collapsed.
          collapsed ? 'md:hidden' : 'md:relative md:z-auto md:w-60 md:translate-x-0',
        )}
      >
        <div className="flex items-center justify-between gap-2 p-3">
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="grid size-6 place-items-center rounded-md bg-brand text-brand-fg">
              <SquareKanban className="size-4" />
            </span>
            librekanban
          </Link>
          <div className="flex items-center gap-0.5">
            <NotificationBell />
            <button
              type="button"
              onClick={onToggleCollapse}
              title={t('nav.collapse')}
              className="hidden size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text md:grid"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </div>
        </div>

        {workspaces.length > 1 && (
          <div className="px-3 pb-2">
            <select
              value={activeWs ?? workspaces[0]?.id ?? ''}
              onChange={(e) => onSwitchWorkspace(e.target.value)}
              title={t('nav.switchWorkspace')}
              className="h-8 w-full rounded-md border border-border bg-bg px-2 text-sm text-muted outline-none hover:text-text focus:ring-2 focus:ring-brand/60"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('nav.boards')}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setImporting(true)}
                title={t('boards.import')}
                className="grid size-6 place-items-center rounded text-muted hover:bg-surface-2 hover:text-text"
              >
                <Upload className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setAdding((a) => !a)}
                title={t('boards.newBoard')}
                className="grid size-6 place-items-center rounded text-muted hover:bg-surface-2 hover:text-text"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          {adding && (
            <input
              // biome-ignore lint/a11y/noAutofocus: focus the new-board field when opened
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createNew();
                if (e.key === 'Escape') setAdding(false);
              }}
              placeholder={t('boards.boardName')}
              className="mb-1 h-8 w-full rounded-md border border-border bg-bg px-2 text-sm outline-none focus:ring-2 focus:ring-brand/60"
            />
          )}

          <nav className="space-y-0.5 pb-2">
            {boards?.map((b) => {
              const active = pathname === `/b/${b.id}`;
              return (
                <Link
                  key={b.id}
                  to="/b/$boardId"
                  params={{ boardId: b.id }}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-surface-2 text-text'
                      : 'text-muted hover:bg-surface-2/60 hover:text-text',
                  )}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: b.color ?? 'var(--color-brand)' }}
                  />
                  <span className="truncate">{b.name}</span>
                </Link>
              );
            })}
            {boards && boards.length === 0 && (
              <div className="px-2 py-1 text-xs text-muted">{t('boards.empty')}</div>
            )}
          </nav>
        </div>

        <div className="border-t border-border p-2 text-sm">
          <Link
            to="/settings"
            title={t('nav.settings')}
            onClick={onClose}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-text"
            activeProps={{ className: 'bg-surface-2 text-text' }}
          >
            <Settings className="size-4" /> {t('nav.settings')}
          </Link>
          <div className="mt-1 flex items-center gap-2 px-2 py-1.5">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-medium text-brand-fg">
              {me?.user.name?.charAt(0).toUpperCase()}
            </span>
            <span className="flex-1 truncate text-muted">{me?.user.name}</span>
            <button
              type="button"
              onClick={onSignOut}
              title={t('nav.signOut')}
              className="text-muted hover:text-text"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>

        {importing && <ImportDialog onClose={() => setImporting(false)} />}
      </aside>
    </>
  );
}
