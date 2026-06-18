import { useT } from '@/lib/i18n';
import { useMe } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { Outlet } from '@tanstack/react-router';
import { Loader2, Menu, SquareKanban } from 'lucide-react';
import { useState } from 'react';
import { AuthPage } from './AuthPage';
import { Sidebar } from './Sidebar';

const COLLAPSE_KEY = 'lk_sidebar_collapsed';

export function AppShell() {
  const t = useT();
  const { data: me, isLoading, isError } = useMe();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const setCollapsed = (v: boolean) => {
    setCollapsedState(v);
    try {
      localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0');
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="grid h-full place-items-center text-muted">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (isError || !me) return <AuthPage />;

  return (
    <div className="flex h-full">
      <Sidebar
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Top bar: always on mobile; on desktop only when the rail is collapsed. */}
        <div
          className={cn(
            'flex items-center gap-2 border-b border-border px-3 py-2',
            !collapsed && 'md:hidden',
          )}
        >
          <button
            type="button"
            onClick={() => {
              setCollapsed(false);
              setDrawerOpen(true);
            }}
            aria-label={t('nav.menu')}
            className="grid size-9 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
          >
            <Menu className="size-5" />
          </button>
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-6 place-items-center rounded-md bg-brand text-brand-fg">
              <SquareKanban className="size-4" />
            </span>
            librekanban
          </span>
        </div>
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
