import { Button } from '@/components/ui/button';
import { getActiveWorkspace, setActiveWorkspace } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { useMe } from '@/lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useRouter } from '@tanstack/react-router';
import { Loader2, LogOut, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthPage } from './AuthPage';
import { NotificationBell } from './NotificationBell';

export function AppShell() {
  const t = useT();
  const { data: me, isLoading, isError } = useMe();
  const qc = useQueryClient();
  const router = useRouter();
  const [activeWs, setActiveWsState] = useState<string | null>(getActiveWorkspace);

  const workspaces = me?.workspaces ?? [];

  // Keep the active workspace valid: if unset (or pointing at a workspace we're
  // no longer a member of), fall back to the primary (first) workspace.
  useEffect(() => {
    const primary = workspaces[0];
    if (!primary) return;
    if (!activeWs || !workspaces.some((w) => w.id === activeWs)) {
      setActiveWorkspace(primary.id);
      setActiveWsState(primary.id);
    }
  }, [workspaces, activeWs]);

  if (isLoading) {
    return (
      <div className="grid h-full place-items-center text-muted">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (isError || !me) return <AuthPage />;

  const onSignOut = async () => {
    await signOut();
    await qc.invalidateQueries();
    router.navigate({ to: '/' });
  };

  const onSwitchWorkspace = async (id: string) => {
    setActiveWorkspace(id);
    setActiveWsState(id);
    // Boards/members/etc. are workspace-scoped via the X-Workspace-Id header, so
    // refetch everything, then return to the boards list (the open board may not
    // belong to the new workspace).
    await qc.invalidateQueries();
    router.navigate({ to: '/' });
  };

  return (
    <div className="flex h-full flex-col">
      <nav className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-semibold tracking-tight">
            librekanban
          </Link>
          {workspaces.length > 1 && (
            <select
              value={activeWs ?? workspaces[0]?.id ?? ''}
              onChange={(e) => onSwitchWorkspace(e.target.value)}
              title={t('nav.switchWorkspace')}
              className="h-8 rounded-md border border-border bg-bg px-2 text-sm text-muted outline-none hover:text-text focus:ring-2 focus:ring-brand/60"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <NotificationBell />
          <Link
            to="/settings"
            title={t('nav.settings')}
            className="grid size-9 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
          >
            <Settings className="size-4" />
          </Link>
          <span className="text-muted">{me.user.name}</span>
          <Button variant="ghost" size="icon" onClick={onSignOut} title={t('nav.signOut')}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </nav>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
