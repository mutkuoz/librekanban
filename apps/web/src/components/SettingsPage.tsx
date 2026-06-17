import { Button } from '@/components/ui/button';
import { getActiveWorkspace } from '@/lib/api';
import {
  useInvitationActions,
  useInvitations,
  useMe,
  useMemberActions,
  useMembers,
  useNotificationPreferences,
  useSetNotificationPreferences,
  useTokenActions,
  useTokens,
  useWebhookActions,
  useWebhooks,
} from '@/lib/queries';
import {
  type CreatedWebhook,
  type Invitation,
  WORKSPACE_ROLES,
  type WorkspaceRole,
  can,
} from '@librekanban/shared';
import { Link } from '@tanstack/react-router';
import { Copy, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';

export function SettingsPage() {
  const { data: me } = useMe();
  const { data: prefs } = useNotificationPreferences();
  const setPrefs = useSetNotificationPreferences();
  const { data: tokens } = useTokens();
  const { create, revoke } = useTokenActions();
  const [name, setName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);

  // Gate UI on the role in the *active* workspace (not necessarily the primary).
  const activeWsId = getActiveWorkspace();
  const activeWorkspace = me?.workspaces.find((w) => w.id === activeWsId) ?? me?.workspaces[0];
  const role = activeWorkspace?.role as WorkspaceRole | undefined;
  const canManageMembers = role ? can(role, 'member:invite') : false;
  const canSetRole = role ? can(role, 'member:setRole') : false;
  const canManageWebhooks = role ? can(role, 'webhook:manage') : false;

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

      {canManageMembers && (
        <>
          <MembersSection canSetRole={canSetRole} currentUserId={me?.user.id ?? ''} />
          <InvitationsSection />
        </>
      )}

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

      {canManageWebhooks && <WebhooksSection />}
    </div>
  );
}

function MembersSection({
  canSetRole,
  currentUserId,
}: {
  canSetRole: boolean;
  currentUserId: string;
}) {
  const { data: members } = useMembers();
  const { setRole, remove } = useMemberActions();

  const onRemove = (userId: string, name: string) => {
    if (window.confirm(`Remove ${name} from this workspace?`)) remove.mutate(userId);
  };

  return (
    <section className="mb-8 rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-3 font-medium">Members</h2>
      <div className="space-y-1.5">
        {members?.map((m) => (
          <div key={m.id} className="group flex items-center gap-2 text-sm">
            <span className="flex-1 truncate">
              {m.name}
              {m.id === currentUserId && <span className="text-muted"> (you)</span>}{' '}
              <span className="text-xs text-muted">{m.email}</span>
            </span>
            {canSetRole && m.id !== currentUserId ? (
              <select
                value={m.role}
                onChange={(e) =>
                  setRole.mutate({ userId: m.id, role: e.target.value as WorkspaceRole })
                }
                className="h-8 rounded-md border border-border bg-bg px-2 text-xs outline-none focus:ring-2 focus:ring-brand/60"
              >
                {WORKSPACE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-muted">{m.role}</span>
            )}
            {m.id !== currentUserId ? (
              <button
                type="button"
                onClick={() => onRemove(m.id, m.name)}
                title="Remove member"
                className="opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="size-3.5 text-muted hover:text-red-400" />
              </button>
            ) : (
              <span className="w-3.5" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

const INVITE_ROLES = WORKSPACE_ROLES.filter((r) => r !== 'owner');

function InvitationsSection() {
  const { data: invitations } = useInvitations();
  const { create, revoke } = useInvitationActions();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('member');
  const [lastInvite, setLastInvite] = useState<Invitation | null>(null);

  const inviteLink = (token: string) => `${window.location.origin}/invite/${token}`;

  const invite = () => {
    const e = email.trim();
    if (!e) return;
    create.mutate({ email: e, role }, { onSuccess: (inv) => setLastInvite(inv) });
    setEmail('');
  };

  return (
    <section className="mb-8 rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-1 font-medium">Invitations</h2>
      <p className="mb-3 text-sm text-muted">
        Invite people by email. They join this workspace when they open the link (and sign in or
        sign up).
      </p>

      {lastInvite && (
        <div className="mb-3 rounded-md border border-brand/50 bg-brand/10 p-3 text-sm">
          <div className="mb-1 font-medium">Invite link for {lastInvite.email}:</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-bg px-2 py-1 text-xs">
              {inviteLink(lastInvite.token)}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(inviteLink(lastInvite.token))}
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && invite()}
          type="email"
          placeholder="teammate@example.com"
          className="h-9 flex-1 rounded-md border border-border bg-bg px-2 text-sm outline-none focus:ring-2 focus:ring-brand/60"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as WorkspaceRole)}
          className="h-9 rounded-md border border-border bg-bg px-2 text-sm outline-none focus:ring-2 focus:ring-brand/60"
        >
          {INVITE_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <Button onClick={invite} disabled={create.isPending}>
          {create.isPending && <Loader2 className="size-4 animate-spin" />} Invite
        </Button>
      </div>

      <div className="space-y-1.5">
        {(!invitations || invitations.length === 0) && (
          <div className="text-sm text-muted">No pending invitations.</div>
        )}
        {invitations?.map((inv) => (
          <div key={inv.id} className="group flex items-center gap-2 text-sm">
            <span className="flex-1 truncate">{inv.email}</span>
            <span className="text-xs text-muted">{inv.role}</span>
            <span className="text-xs text-muted">
              expires {new Date(inv.expiresAt).toLocaleDateString()}
            </span>
            <button
              type="button"
              onClick={() => revoke.mutate(inv.id)}
              title="Revoke invitation"
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="size-3.5 text-muted hover:text-red-400" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function WebhooksSection() {
  const { data: webhooks } = useWebhooks();
  const { create, remove } = useWebhookActions();
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState('');
  const [created, setCreated] = useState<CreatedWebhook | null>(null);

  const add = () => {
    const u = url.trim();
    if (!u) return;
    const list = events
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    create.mutate(
      { url: u, events: list.length ? list : undefined },
      { onSuccess: (w) => setCreated(w) },
    );
    setUrl('');
    setEvents('');
  };

  return (
    <section className="mt-8 rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-1 font-medium">Webhooks</h2>
      <p className="mb-3 text-sm text-muted">
        POST signed events (HMAC-SHA256 in <code className="text-xs">X-Librekanban-Signature</code>)
        to a URL when cards or comments change.
      </p>

      {created && (
        <div className="mb-3 rounded-md border border-brand/50 bg-brand/10 p-3 text-sm">
          <div className="mb-1 font-medium">Signing secret (shown once):</div>
          <code className="block break-all rounded bg-bg px-2 py-1 text-xs">{created.secret}</code>
        </div>
      )}

      <div className="mb-4 space-y-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/webhook"
          className="h-9 w-full rounded-md border border-border bg-bg px-2 text-sm outline-none focus:ring-2 focus:ring-brand/60"
        />
        <div className="flex gap-2">
          <input
            value={events}
            onChange={(e) => setEvents(e.target.value)}
            placeholder="events (blank = all): card.created, card.moved"
            className="h-9 flex-1 rounded-md border border-border bg-bg px-2 text-sm outline-none focus:ring-2 focus:ring-brand/60"
          />
          <Button onClick={add} disabled={create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />} Add
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        {(!webhooks || webhooks.length === 0) && (
          <div className="text-sm text-muted">No webhooks yet.</div>
        )}
        {webhooks?.map((w) => (
          <div key={w.id} className="group flex items-center gap-2 text-sm">
            <span className="flex-1 truncate">{w.url}</span>
            <span className="text-xs text-muted">
              {w.events.length ? w.events.join(', ') : 'all events'}
            </span>
            <button
              type="button"
              onClick={() => remove.mutate(w.id)}
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="size-3.5 text-muted hover:text-red-400" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
