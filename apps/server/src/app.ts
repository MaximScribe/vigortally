import { Hono } from 'hono';
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
export function createApp() {
  const app = new Hono();
  const api = new Hono();

  api.get('/health', (c) => c.json({ status: 'ok' }));

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

  app.route('/api', api);
  return app;
}

export type App = ReturnType<typeof createApp>;
