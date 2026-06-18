import { type TFunc, useT } from '@/lib/i18n';
import {
  useNotificationActions,
  useNotificationPreferences,
  useNotifications,
  useSetNotificationPreferences,
  useUnreadCount,
} from '@/lib/queries';
import { cn } from '@/lib/utils';
import type { Notification } from '@librekanban/shared';
import { useRouter } from '@tanstack/react-router';
import { Bell } from 'lucide-react';
import { useState } from 'react';

function describe(n: Notification, t: TFunc): string {
  const title = typeof n.data.cardTitle === 'string' ? `"${n.data.cardTitle}"` : t('notif.aCard');
  if (n.type === 'card.assigned') return t('notif.assigned', { title });
  if (n.type === 'comment.mention') return t('notif.mentioned');
  if (n.type === 'comment.added') return t('notif.newComment');
  return n.type;
}

function ago(iso: string, t: TFunc): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t('notif.justNow');
  if (s < 3600) return t('notif.minutesAgo', { n: Math.floor(s / 60) });
  if (s < 86400) return t('notif.hoursAgo', { n: Math.floor(s / 3600) });
  return t('notif.daysAgo', { n: Math.floor(s / 86400) });
}

export function NotificationBell() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { data: count } = useUnreadCount();
  const { data: notifications } = useNotifications();
  const { markRead, markAll } = useNotificationActions();
  const { data: prefs } = useNotificationPreferences();
  const setPrefs = useSetNotificationPreferences();
  const router = useRouter();
  const unread = count?.count ?? 0;

  const onClickNotification = (n: Notification) => {
    markRead.mutate(n.id);
    if (typeof n.data.boardId === 'string') {
      router.navigate({ to: '/b/$boardId', params: { boardId: n.data.boardId } });
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-9 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
        title={t('nav.notifications')}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-fg">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="lk-pop absolute left-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-semibold">{t('nav.notifications')}</span>
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="text-xs text-muted hover:text-text"
              >
                {t('notif.markAllRead')}
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {!notifications || notifications.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted">
                  {t('notif.caughtUp')}
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => onClickNotification(n)}
                    className={cn(
                      'flex w-full items-start gap-2 border-b border-border px-3 py-2.5 text-left text-sm last:border-0 hover:bg-surface-2',
                      !n.readAt && 'bg-brand/5',
                    )}
                  >
                    {!n.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
                    <div className={cn('flex-1', n.readAt && 'pl-4')}>
                      <div>{describe(n, t)}</div>
                      <div className="text-xs text-muted">{ago(n.createdAt, t)}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-2 border-t border-border px-3 py-2.5 text-sm text-muted">
              {t('notif.emailActivity')}
              <input
                type="checkbox"
                checked={prefs?.emailEnabled ?? true}
                onChange={(e) => setPrefs.mutate(e.target.checked)}
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}
