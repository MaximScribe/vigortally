import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppDeps, AppEnv } from './context';
import { API_VERSION, APP_NAME, SERVER_VERSION } from './meta';
import { requireAuth } from './auth/middleware';
import { activityRoutes } from './routes/activities';
import { authRoutes } from './routes/auth';

/** Endpoints reachable without signing in. Everything else requires a session. */
const PUBLIC_ROUTES = new Set([
  'GET /api/health',
  'GET /api/info',
  'GET /api/setup',
  'POST /api/setup',
  'POST /api/auth/login',
  'POST /api/devices/pair',
]);

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

  api.use(async (c, next) => {
    if (PUBLIC_ROUTES.has(`${c.req.method} ${c.req.path}`)) return next();
    return requireAuth(c, next);
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

  api.route('/', authRoutes());
  api.route('/', activityRoutes());

  // Hono ignores notFound() on mounted sub-apps, so unknown API paths use a catch-all.
  // Registered last so it never shadows real routes.
  api.all('*', (c) => c.json({ error: 'not_found' }, 404));

  api.onError((error, c) => {
    if (error instanceof HTTPException) return error.getResponse();
    deps.log.error('Unhandled error', { path: c.req.path, error: String(error) });
    return c.json({ error: 'internal_error' }, 500);
  });

  app.route('/api', api);
  return app;
}

export type App = ReturnType<typeof createApp>;
