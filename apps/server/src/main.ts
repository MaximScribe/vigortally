import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { ConfigError, loadConfig, type Config } from './config';
import { openDatabase } from './db/client';
import { findMigrationsFolder } from './db/migrations';
import { createLogger } from './logger';
import { API_VERSION, SERVER_VERSION } from './meta';
import { mountWebApp } from './web';

function readConfig(): Config {
  try {
    return loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

async function start() {
  const config = readConfig();
  const log = createLogger(config.logLevel);

  const database = await openDatabase(
    config.databaseUrl
      ? { kind: 'postgres', url: config.databaseUrl }
      : { kind: 'embedded', dataDir: config.dataDir },
    { migrationsFolder: findMigrationsFolder() },
  );
  log.info('Applying database migrations', { database: database.kind });
  await database.migrate();

  const app = createApp({ config, database, log, now: () => new Date(), fetch: globalThis.fetch });
  // apps/server/{src,dist} -> apps/web/dist
  const webDir =
    config.webDir ?? resolve(dirname(fileURLToPath(import.meta.url)), '../../web/dist');
  if (mountWebApp(app, webDir)) log.info('Serving the web app', { webDir });
  else log.warn('Web app not found; only the API is served', { webDir });

  const server = serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
    log.info('VigorTally server listening', {
      address: `http://${info.address}:${info.port}`,
      publicUrl: config.publicUrl,
      version: SERVER_VERSION,
      apiVersion: API_VERSION,
      env: config.env,
      database: database.kind,
    });
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    log.error('Could not start the HTTP server', {
      error: error.code ?? String(error),
      host: config.host,
      port: config.port,
    });
    process.exit(1);
  });

  // Docker sends SIGTERM on `docker stop`; finish open requests before exiting.
  const shutdown = (signal: string) => {
    log.info('Shutting down', { signal });
    server.close(async (error) => {
      await database.close().catch(() => {});
      if (error) {
        log.error('Error while closing the server', { error: String(error) });
        process.exit(1);
      }
      process.exit(0);
    });
    // Don't hang forever on keep-alive connections.
    setTimeout(() => process.exit(0), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error: unknown) => {
  console.error('Failed to start VigorTally:', error);
  process.exit(1);
});
