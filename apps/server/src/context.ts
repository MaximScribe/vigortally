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
}

/** Hono context variables available in every handler. */
export interface AppEnv {
  Variables: {
    deps: AppDeps;
    db: Database;
  };
}
