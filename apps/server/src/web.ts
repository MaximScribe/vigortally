import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import type { Hono } from 'hono';
import type { AppEnv } from './context';

/**
 * Serves the built web app (apps/web/dist) from the same server as the API, so a
 * self-hosted install is a single container. Unknown paths get index.html so the
 * client-side router can handle them.
 */
export function mountWebApp(app: Hono<AppEnv>, webDir: string): boolean {
  const indexFile = join(webDir, 'index.html');
  if (!existsSync(indexFile)) return false;
  const index = readFileSync(indexFile, 'utf8');
  // serveStatic resolves `root` against the working directory.
  const root = relative(process.cwd(), resolve(webDir)) || '.';

  // Fingerprinted build assets never change: cache them for a year.
  app.use('/assets/*', async (c, next) => {
    await next();
    if (c.res.ok) c.header('cache-control', 'public, max-age=31536000, immutable');
  });
  // The HTML shell must always be revalidated so updates reach the browser.
  app.use('*', async (c, next) => {
    await next();
    if (c.res.headers.get('content-type')?.startsWith('text/html')) {
      c.header('cache-control', 'no-cache');
    }
  });
  app.use('*', serveStatic({ root }));
  app.get('*', (c) => c.html(index));
  return true;
}
