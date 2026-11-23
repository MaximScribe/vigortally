import type { AuthSession, AuthUser } from './auth/sessions';
import type { Config } from './config';
import type { Database, DatabaseHandle } from './db/client';
import type { Logger } from './logger';

/** Everything route handlers need, created once at startup (or per test). */
export interface AppDeps {
  config: Config;
  database: DatabaseHandle;
  log: Logger;
  /** Clock, replaceable in tests. */
  now: () => Date;
  /** HTTP client for outside services (Open Food Facts, recipe import). */
  fetch: typeof fetch;
}

/** Hono context variables available in every handler. */
export interface AppEnv {
  Variables: {
    deps: AppDeps;
    db: Database;
    /** Set by `requireAuth`. */
    user: AuthUser;
    session: AuthSession;
  };
}
