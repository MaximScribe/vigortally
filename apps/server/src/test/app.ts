import { createApp } from '../app';
import { loadConfig } from '../config';
import type { AppDeps } from '../context';
import { createLogger } from '../logger';
import { createTestDatabase } from './db';

/** App wired to a fresh in-memory database. Call `close()` when done. */
export async function createTestApp(overrides: Partial<AppDeps> = {}) {
  const database = await createTestDatabase();
  const deps: AppDeps = {
    config: loadConfig({ NODE_ENV: 'test', PUBLIC_URL: 'https://vt.example.ts.net' }),
    database,
    log: createLogger('error', () => {}),
    now: () => new Date(),
    fetch: () => Promise.reject(new Error('No network in tests')),
    ...overrides,
  };
  const app = createApp(deps);
  return { app, deps, db: database.db, close: () => database.close() };
}
