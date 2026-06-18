import { api, setActiveWorkspace } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Lands here from an invite link (`/invite/:token`). Rendered inside the
 * authenticated shell, so by the time it mounts the user is signed in. Accepts
 * the invitation once, switches to the joined workspace, then redirects home.
 */
export function AcceptInvitePage({ token }: { token: string }) {
  const t = useT();
  const qc = useQueryClient();
  const router = useRouter();
  const fired = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fired.current) return; // accept exactly once (StrictMode double-invokes effects)
    fired.current = true;
    (async () => {
      try {
        const { workspaceId } = await api.acceptInvitation(token);
        setActiveWorkspace(workspaceId);
        await qc.invalidateQueries();
        router.navigate({ to: '/' });
      } catch (err) {
        setError(err instanceof Error ? err.message : t('invite.invalid'));
      }
    })();
  }, [token, qc, router, t]);

  return (
    <div className="grid h-full place-items-center p-6 text-center">
      {error ? (
        <div className="max-w-sm space-y-3">
          <h1 className="text-lg font-semibold">{t('invite.problem')}</h1>
          <p className="text-sm text-muted">{error}</p>
          <Link to="/" className="inline-block text-sm text-brand hover:underline">
            {t('invite.goToBoards')}
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-muted">
          <Loader2 className="size-5 animate-spin" /> {t('invite.accepting')}
        </div>
      )}
    </div>
  );
}
