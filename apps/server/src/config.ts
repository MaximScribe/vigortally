import { z } from 'zod';

/**
 * Server configuration, read from environment variables.
 * Everything has a sensible default so `docker compose up` works without extra setup.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  /**
   * The URL people use to reach this server, e.g. https://vigortally.your-tailnet.ts.net.
   * Used in pairing QR codes and OAuth redirects. Optional until those features are used.
   */
  PUBLIC_URL: z
    .url({ protocol: /^https?$/ })
    .transform((url) => url.replace(/\/+$/, ''))
    .optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export interface Config {
  env: 'development' | 'production' | 'test';
  host: string;
  port: number;
  publicUrl: string | undefined;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export class ConfigError extends Error {
  override name = 'ConfigError';
}

/** Parses the environment. Throws a `ConfigError` listing every invalid variable. */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  // Treat empty strings like unset variables (common with `FOO=` in compose files).
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ''));
  const result = envSchema.safeParse(cleaned);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new ConfigError(`Invalid configuration:\n${problems}`);
  }

  const parsed = result.data;
  return {
    env: parsed.NODE_ENV,
    host: parsed.HOST,
    port: parsed.PORT,
    publicUrl: parsed.PUBLIC_URL,
    logLevel: parsed.LOG_LEVEL,
  };
}
