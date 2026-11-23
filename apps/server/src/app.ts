import { Hono } from 'hono';
import type { AppDeps, AppEnv } from './context';
import { API_VERSION, APP_NAME, SERVER_VERSION } from './meta';

export interface ServerInfo {
  name: string;
  version: string;
  apiVersion: number;
  /** Optional features this server supports; clients enable UI based on this list. */
  features: string[];
}

/**
 * Builds the HTTP application. Kept free of side effects (no listening, no env access)
 * so tests can call `app.request()` directly.
 */
export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>();
  const api = new Hono<AppEnv>();

  api.use(async (c, next) => {
    c.set('deps', deps);
    c.set('db', deps.database.db);
    await next();
  });

  api.get('/health', async (c) => {
    const database = (await deps.database.ping()) ? 'ok' : 'unavailable';
    const ok = database === 'ok';
    return c.json({ status: ok ? 'ok' : 'degraded', database }, ok ? 200 : 503);
  });

  api.get('/info', (c) =>
    c.json<ServerInfo>({
      name: APP_NAME,
      version: SERVER_VERSION,
      apiVersion: API_VERSION,
      features: [],
    }),
  );

  // Hono ignores notFound() on mounted sub-apps, so unknown API paths use a catch-all.
  // Registered last so it never shadows real routes.
  api.all('*', (c) => c.json({ error: 'not_found' }, 404));

  api.onError((error, c) => {
    deps.log.error('Unhandled error', { path: c.req.path, error: String(error) });
    return c.json({ error: 'internal_error' }, 500);
  });

  app.route('/api', api);
  return app;
}

export type App = ReturnType<typeof createApp>;
