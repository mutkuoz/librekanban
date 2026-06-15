import { Button } from '@/components/ui/button';
import {
  useNotificationPreferences,
  useSetNotificationPreferences,
  useTokenActions,
  useTokens,
} from '@/lib/queries';
import { Link } from '@tanstack/react-router';
import { Copy, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';

export function SettingsPage() {
  const { data: prefs } = useNotificationPreferences();
  const setPrefs = useSetNotificationPreferences();
  const { data: tokens } = useTokens();
  const { create, revoke } = useTokenActions();
  const [name, setName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);

  const addToken = () => {
    const n = name.trim();
    if (!n) return;
    create.mutate({ name: n }, { onSuccess: (d) => setNewToken(d.token) });
    setName('');
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link to="/" className="text-sm text-muted hover:text-text">
        ← Boards
      </Link>
      <h1 className="mt-2 mb-6 text-xl font-semibold">Settings</h1>

      <section className="mb-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-medium">Notifications</h2>
        <label className="flex items-center justify-between gap-2 text-sm">
          Email me about activity (assignments, comments, mentions)
          <input
            type="checkbox"
            checked={prefs?.emailEnabled ?? true}
            onChange={(e) => setPrefs.mutate(e.target.checked)}
          />
        </label>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-1 font-medium">API tokens</h2>
        <p className="mb-3 text-sm text-muted">
          Use a token as <code className="text-xs">Authorization: Bearer …</code> to call the REST
          API.
        </p>

        {newToken && (
          <div className="mb-3 rounded-md border border-brand/50 bg-brand/10 p-3 text-sm">
            <div className="mb-1 font-medium">Copy your token now — it won't be shown again:</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-bg px-2 py-1 text-xs">{newToken}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(newToken)}
                title="Copy"
                className="text-muted hover:text-text"
              >
                <Copy className="size-4" />
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addToken()}
            placeholder="Token name (e.g. CI)"
            className="h-9 flex-1 rounded-md border border-border bg-bg px-2 text-sm outline-none focus:ring-2 focus:ring-brand/60"
          />
          <Button onClick={addToken} disabled={create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />} Create
          </Button>
        </div>

        <div className="space-y-1.5">
          {(!tokens || tokens.length === 0) && (
            <div className="text-sm text-muted">No tokens yet.</div>
          )}
          {tokens?.map((t) => (
            <div key={t.id} className="group flex items-center gap-2 text-sm">
              <span className="flex-1">
                {t.name} <code className="text-xs text-muted">{t.prefix}…</code>
              </span>
              <span className="text-xs text-muted">
                {t.lastUsedAt
                  ? `used ${new Date(t.lastUsedAt).toLocaleDateString()}`
                  : 'never used'}
              </span>
              <button
                type="button"
                onClick={() => revoke.mutate(t.id)}
                className="opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="size-3.5 text-muted hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
