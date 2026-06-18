import { Button } from '@/components/ui/button';
import { getActiveWorkspace } from '@/lib/api';
import { type TwoFactorSetup, disable2FA, enable2FA, verifyTotp } from '@/lib/auth';
import { LANGUAGES, type Lang, type TranslationKey, useI18n, useT } from '@/lib/i18n';
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
  ACCENTS,
  type ThemeMode,
  getAccent,
  getThemeMode,
  setAccent,
  setThemeMode,
} from '@/lib/theme';
import { cn } from '@/lib/utils';
import {
  type CreatedWebhook,
  type Invitation,
  WORKSPACE_ROLES,
  type WorkspaceRole,
  can,
} from '@librekanban/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Copy, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';

export function SettingsPage() {
  const t = useT();
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

  const sectionNav = [
    canManageMembers && { id: 'members', label: t('settings.members') },
    canManageMembers && { id: 'invitations', label: t('settings.invitations') },
    { id: 'notifications', label: t('settings.notifications') },
    { id: 'appearance', label: t('settings.appearance') },
    { id: 'security', label: t('settings.security') },
    { id: 'tokens', label: t('settings.apiTokens') },
    canManageWebhooks && { id: 'webhooks', label: t('settings.webhooks') },
  ].filter((s): s is { id: string; label: string } => Boolean(s));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl p-6">
        <Link to="/" className="text-sm text-muted hover:text-text">
          {t('board.back')}
        </Link>
        <h1 className="mt-2 mb-4 text-xl font-semibold">{t('settings.title')}</h1>

        <nav className="mb-6 flex flex-wrap gap-1.5">
          {sectionNav.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() =>
                document
                  .getElementById(s.id)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted transition-colors hover:border-brand/60 hover:text-text"
            >
              {s.label}
            </button>
          ))}
        </nav>

        {canManageMembers && (
          <>
            <MembersSection canSetRole={canSetRole} currentUserId={me?.user.id ?? ''} />
            <InvitationsSection />
          </>
        )}

        <section
          id="notifications"
          className="mb-8 scroll-mt-6 rounded-xl border border-border bg-surface p-5"
        >
          <h2 className="mb-3 font-medium">{t('settings.notifications')}</h2>
          <label className="flex items-center justify-between gap-2 text-sm">
            {t('settings.emailActivity')}
            <input
              type="checkbox"
              checked={prefs?.emailEnabled ?? true}
              onChange={(e) => setPrefs.mutate(e.target.checked)}
            />
          </label>
        </section>

        <AppearanceSection />

        <SecuritySection enabled={me?.user.twoFactorEnabled ?? false} />

        <section
          id="tokens"
          className="mb-8 scroll-mt-6 rounded-xl border border-border bg-surface p-5"
        >
          <h2 className="mb-1 font-medium">{t('settings.apiTokens')}</h2>
          <p className="mb-3 text-sm text-muted">{t('settings.tokensHint')}</p>

          {newToken && (
            <div className="mb-3 rounded-md border border-brand/50 bg-brand/10 p-3 text-sm">
              <div className="mb-1 font-medium">{t('settings.tokenOnce')}</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-bg px-2 py-1 text-xs">{newToken}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(newToken)}
                  title={t('common.copy')}
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
              placeholder={t('settings.tokenName')}
              className="h-9 flex-1 rounded-md border border-border bg-bg px-2 text-sm outline-none focus:ring-2 focus:ring-brand/60"
            />
            <Button onClick={addToken} disabled={create.isPending}>
              {create.isPending && <Loader2 className="size-4 animate-spin" />} {t('common.create')}
            </Button>
          </div>

          <div className="space-y-1.5">
            {(!tokens || tokens.length === 0) && (
              <div className="text-sm text-muted">{t('settings.noTokens')}</div>
            )}
            {tokens?.map((tok) => (
              <div key={tok.id} className="group flex items-center gap-2 text-sm">
                <span className="flex-1">
                  {tok.name} <code className="text-xs text-muted">{tok.prefix}…</code>
                </span>
                <span className="text-xs text-muted">
                  {tok.lastUsedAt
                    ? t('settings.usedOn', { date: new Date(tok.lastUsedAt).toLocaleDateString() })
                    : t('settings.neverUsed')}
                </span>
                <button
                  type="button"
                  onClick={() => revoke.mutate(tok.id)}
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
    </div>
  );
}

const THEME_MODES: ThemeMode[] = ['light', 'dark', 'auto'];
const THEME_LABEL: Record<ThemeMode, TranslationKey> = {
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
  auto: 'settings.themeAuto',
};

function AppearanceSection() {
  const t = useT();
  const { lang, setLang } = useI18n();
  const [mode, setMode] = useState<ThemeMode>(getThemeMode);
  const [accent, setAccentState] = useState<string>(getAccent);

  return (
    <section
      id="appearance"
      className="mb-8 scroll-mt-6 rounded-xl border border-border bg-surface p-5"
    >
      <h2 className="mb-3 font-medium">{t('settings.appearance')}</h2>

      <div className="mb-4 flex items-center justify-between gap-2 text-sm">
        <span>{t('settings.theme')}</span>
        <div className="flex rounded-md border border-border p-0.5">
          {THEME_MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setThemeMode(m);
                setMode(m);
              }}
              className={cn(
                'rounded px-2.5 py-1',
                mode === m ? 'bg-surface-2 text-text' : 'text-muted hover:text-text',
              )}
            >
              {t(THEME_LABEL[m])}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-2 text-sm">
        <span>{t('settings.accent')}</span>
        <div className="flex gap-1.5">
          {Object.keys(ACCENTS).map((accentName) => (
            <button
              key={accentName}
              type="button"
              title={accentName}
              aria-label={`Accent ${accentName}`}
              onClick={() => {
                setAccent(accentName);
                setAccentState(accentName);
              }}
              className={cn(
                'size-6 rounded-full border-2',
                accent === accentName ? 'border-text' : 'border-border',
              )}
              style={{ background: ACCENTS[accentName] ?? 'var(--color-brand)' }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <span>{t('settings.language')}</span>
        <div className="flex rounded-md border border-border p-0.5">
          {(Object.entries(LANGUAGES) as [Lang, string][]).map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={cn(
                'rounded px-2.5 py-1',
                lang === code ? 'bg-surface-2 text-text' : 'text-muted hover:text-text',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

const fieldCls =
  'h-9 flex-1 rounded-md border border-border bg-bg px-2 text-sm outline-none focus:ring-2 focus:ring-brand/60';

function SecuritySection({ enabled }: { enabled: boolean }) {
  const t = useT();
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMe = () => qc.invalidateQueries({ queryKey: ['me'] });
  const run = async (fn: () => Promise<void>, fallback: string) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const begin = () =>
    run(async () => {
      setSetup(await enable2FA(password));
      setPassword('');
    }, t('settings.twoFactorStartError'));
  const confirm = () =>
    run(async () => {
      await verifyTotp(code.trim());
      setSetup(null);
      setCode('');
      await refreshMe();
    }, t('auth.invalidCode'));
  const disable = () =>
    run(async () => {
      await disable2FA(password);
      setPassword('');
      await refreshMe();
    }, t('settings.twoFactorDisableError'));

  return (
    <section
      id="security"
      className="mb-8 scroll-mt-6 rounded-xl border border-border bg-surface p-5"
    >
      <h2 className="mb-1 font-medium">{t('settings.security')}</h2>
      <p className="mb-3 text-sm text-muted">{t('settings.securityHint')}</p>

      {enabled ? (
        <div className="space-y-2">
          <div className="text-sm text-emerald-400">{t('settings.twoFactorOn')}</div>
          <div className="flex gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('settings.currentPassword')}
              className={fieldCls}
            />
            <Button variant="danger" onClick={disable} disabled={busy || !password}>
              {busy && <Loader2 className="size-4 animate-spin" />} {t('common.disable')}
            </Button>
          </div>
        </div>
      ) : setup ? (
        <div className="space-y-2 text-sm">
          <div>{t('settings.twoFactorSetup')}</div>
          <code className="block break-all rounded bg-bg px-2 py-1 text-xs">{setup.totpURI}</code>
          <div className="text-muted">{t('settings.backupCodes')}</div>
          <code className="block whitespace-pre-wrap rounded bg-bg px-2 py-1 text-xs">
            {setup.backupCodes.join('   ')}
          </code>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              className={fieldCls}
            />
            <Button onClick={confirm} disabled={busy || !code}>
              {busy && <Loader2 className="size-4 animate-spin" />} {t('common.confirm')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('settings.currentPassword')}
            className={fieldCls}
          />
          <Button onClick={begin} disabled={busy || !password}>
            {busy && <Loader2 className="size-4 animate-spin" />} {t('common.enable')}
          </Button>
        </div>
      )}

      {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
    </section>
  );
}

function MembersSection({
  canSetRole,
  currentUserId,
}: {
  canSetRole: boolean;
  currentUserId: string;
}) {
  const t = useT();
  const { data: members } = useMembers();
  const { setRole, remove } = useMemberActions();

  const onRemove = (userId: string, name: string) => {
    if (window.confirm(t('settings.removeConfirm', { name }))) remove.mutate(userId);
  };

  return (
    <section
      id="members"
      className="mb-8 scroll-mt-6 rounded-xl border border-border bg-surface p-5"
    >
      <h2 className="mb-1 font-medium">{t('settings.members')}</h2>
      <p className="mb-3 text-sm text-muted">{t('settings.membersHint')}</p>
      <div className="space-y-1.5">
        {members?.map((m) => (
          <div key={m.id} className="group flex items-center gap-2 text-sm">
            <span className="flex-1 truncate">
              {m.name}
              {m.id === currentUserId && <span className="text-muted">{t('settings.you')}</span>}{' '}
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
                title={t('settings.removeMember')}
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
  const t = useT();
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
    <section
      id="invitations"
      className="mb-8 scroll-mt-6 rounded-xl border border-border bg-surface p-5"
    >
      <h2 className="mb-1 font-medium">{t('settings.invitations')}</h2>
      <p className="mb-3 text-sm text-muted">{t('settings.invitationsHint')}</p>

      {lastInvite && (
        <div className="mb-3 rounded-md border border-brand/50 bg-brand/10 p-3 text-sm">
          <div className="mb-1 font-medium">
            {t('settings.inviteLinkFor', { email: lastInvite.email })}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-bg px-2 py-1 text-xs">
              {inviteLink(lastInvite.token)}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(inviteLink(lastInvite.token))}
              title={t('common.copy')}
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
          {create.isPending && <Loader2 className="size-4 animate-spin" />} {t('settings.invite')}
        </Button>
      </div>

      <div className="space-y-1.5">
        {(!invitations || invitations.length === 0) && (
          <div className="text-sm text-muted">{t('settings.noInvitations')}</div>
        )}
        {invitations?.map((inv) => (
          <div key={inv.id} className="group flex items-center gap-2 text-sm">
            <span className="flex-1 truncate">{inv.email}</span>
            <span className="text-xs text-muted">{inv.role}</span>
            <span className="text-xs text-muted">
              {t('settings.expires', { date: new Date(inv.expiresAt).toLocaleDateString() })}
            </span>
            <button
              type="button"
              onClick={() => revoke.mutate(inv.id)}
              title={t('settings.revokeInvitation')}
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
  const t = useT();
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
    <section
      id="webhooks"
      className="mb-8 scroll-mt-6 rounded-xl border border-border bg-surface p-5"
    >
      <h2 className="mb-1 font-medium">{t('settings.webhooks')}</h2>
      <p className="mb-3 text-sm text-muted">{t('settings.webhooksHint')}</p>

      {created && (
        <div className="mb-3 rounded-md border border-brand/50 bg-brand/10 p-3 text-sm">
          <div className="mb-1 font-medium">{t('settings.webhookSecret')}</div>
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
            placeholder={t('settings.webhookEvents')}
            className="h-9 flex-1 rounded-md border border-border bg-bg px-2 text-sm outline-none focus:ring-2 focus:ring-brand/60"
          />
          <Button onClick={add} disabled={create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />} {t('common.add')}
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        {(!webhooks || webhooks.length === 0) && (
          <div className="text-sm text-muted">{t('settings.noWebhooks')}</div>
        )}
        {webhooks?.map((w) => (
          <div key={w.id} className="group flex items-center gap-2 text-sm">
            <span className="flex-1 truncate">{w.url}</span>
            <span className="text-xs text-muted">
              {w.events.length ? w.events.join(', ') : t('settings.allEvents')}
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
