import type { Auth, AuthSession } from '@librekanban/auth';
import type { Database } from '@librekanban/db';
import type { StorageBackend } from '@librekanban/storage';
import type { Logger } from 'pino';
import type { Env } from '../env';
import type { EventBus } from '../realtime/event-bus';
import type { PresenceTracker } from '../realtime/presence';
import type { Emailer } from '../services/email.service';

/** Everything the app needs, built once at the composition root and injected. */
export interface Deps {
  env: Env;
  db: Database;
  auth: Auth;
  bus: EventBus;
  presence: PresenceTracker;
  storage: StorageBackend;
  email: Emailer;
  logger: Logger;
}

/** The authenticated user shape, derived from better-auth's session. */
export type SessionUser = NonNullable<AuthSession>['user'];

/** Hono environment: request-scoped variables available via `c.get(...)`. */
export type AppEnv = {
  Variables: {
    deps: Deps;
    user: SessionUser | null;
    requestId: string;
  };
};
