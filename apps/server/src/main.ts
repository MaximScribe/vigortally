import { serve } from '@hono/node-server';
import { createApp } from './app';
import { ConfigError, loadConfig } from './config';
import { createLogger } from './logger';
import { API_VERSION, SERVER_VERSION } from './meta';

function start() {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  const log = createLogger(config.logLevel);
  const app = createApp();

  const server = serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
    log.info('VigorTally server listening', {
      address: `http://${info.address}:${info.port}`,
      publicUrl: config.publicUrl,
      version: SERVER_VERSION,
      apiVersion: API_VERSION,
      env: config.env,
    });
  });

  // Docker sends SIGTERM on `docker stop`; finish open requests before exiting.
  const shutdown = (signal: string) => {
    log.info('Shutting down', { signal });
    server.close((error) => {
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

start();
