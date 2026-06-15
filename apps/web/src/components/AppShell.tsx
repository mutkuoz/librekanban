import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth';
import { useMe } from '@/lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { Outlet, useRouter } from '@tanstack/react-router';
import { Loader2, LogOut } from 'lucide-react';
import { AuthPage } from './AuthPage';
import { NotificationBell } from './NotificationBell';

export function AppShell() {
  const { data: me, isLoading, isError } = useMe();
  const qc = useQueryClient();
  const router = useRouter();

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

  return (
    <div className="flex h-full flex-col">
      <nav className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="font-semibold tracking-tight">librekanban</div>
        <div className="flex items-center gap-2 text-sm">
          <NotificationBell />
          <span className="text-muted">{me.user.name}</span>
          <Button variant="ghost" size="icon" onClick={onSignOut} title="Sign out">
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
