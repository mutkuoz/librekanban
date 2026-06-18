import { useMe } from '@/lib/queries';
import { Outlet } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { AuthPage } from './AuthPage';
import { Sidebar } from './Sidebar';

export function AppShell() {
  const { data: me, isLoading, isError } = useMe();

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
      <Sidebar />
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
