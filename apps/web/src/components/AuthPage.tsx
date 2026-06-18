import { Button } from '@/components/ui/button';
import { signIn, signInWith, signInWithOIDC, signUp } from '@/lib/auth';
import { useAppConfig } from '@/lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { Github, KeyRound, Loader2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';

export function AuthPage() {
  const qc = useQueryClient();
  const { data: config } = useAppConfig();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') await signUp(name, email, password);
      else await signIn(email, password);
      await qc.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full h-10 rounded-md bg-bg border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-brand/60';

  return (
    <div className="min-h-full grid place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-2xl font-semibold tracking-tight">librekanban</div>
          <div className="text-muted text-sm mt-1">Fast, self-hosted task boards</div>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-3 bg-surface border border-border rounded-xl p-5"
        >
          {mode === 'signup' && (
            <input
              className={inputCls}
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            className={inputCls}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={inputCls}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />

          {error && <div className="text-sm text-red-400">{error}</div>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>

          <div className="flex items-center gap-3 py-1 text-xs text-muted">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => signInWith('github')}
          >
            <Github className="size-4" /> Continue with GitHub
          </Button>

          {config?.oidcEnabled && (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => signInWithOIDC()}
            >
              <KeyRound className="size-4" /> Continue with {config.oidcName}
            </Button>
          )}
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-muted hover:text-text"
          onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
        >
          {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </div>
    </div>
  );
}
