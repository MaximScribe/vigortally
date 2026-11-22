import { describe, expect, test } from 'vitest';
import { ConfigError, loadConfig } from './config';

describe('loadConfig', () => {
  test('uses defaults for an empty environment', () => {
    expect(loadConfig({})).toEqual({
      env: 'production',
      host: '0.0.0.0',
      port: 8080,
      publicUrl: undefined,
      logLevel: 'info',
    });
  });

  test('reads and coerces variables', () => {
    const config = loadConfig({
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: '3000',
      PUBLIC_URL: 'https://vigortally.example.ts.net/',
      LOG_LEVEL: 'debug',
    });
    expect(config).toMatchObject({
      env: 'development',
      host: '127.0.0.1',
      port: 3000,
      publicUrl: 'https://vigortally.example.ts.net',
      logLevel: 'debug',
    });
  });

  test('treats empty strings as unset', () => {
    expect(loadConfig({ PORT: '', PUBLIC_URL: '' })).toMatchObject({
      port: 8080,
      publicUrl: undefined,
    });
  });

  test('reports every invalid variable at once', () => {
    const load = () => loadConfig({ PORT: 'abc', PUBLIC_URL: 'ftp://nope', LOG_LEVEL: 'loud' });
    expect(load).toThrow(ConfigError);
    expect(load).toThrow(/PORT/);
    expect(load).toThrow(/PUBLIC_URL/);
    expect(load).toThrow(/LOG_LEVEL/);
  });

  test('rejects out-of-range ports', () => {
    expect(() => loadConfig({ PORT: '70000' })).toThrow(ConfigError);
  });
});
