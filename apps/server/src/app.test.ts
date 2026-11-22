import { describe, expect, test } from 'vitest';
import { createApp, type ServerInfo } from './app';
import { API_VERSION, SERVER_VERSION } from './meta';

const app = createApp();

describe('GET /api/health', () => {
  test('reports ok', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});

describe('GET /api/info', () => {
  test('describes the server for companion apps', async () => {
    const res = await app.request('/api/info');
    expect(res.status).toBe(200);
    const info = (await res.json()) as ServerInfo;
    expect(info).toEqual({
      name: 'VigorTally',
      version: SERVER_VERSION,
      apiVersion: API_VERSION,
      features: [],
    });
  });
});

test('unknown API routes return a JSON 404', async () => {
  const res = await app.request('/api/does-not-exist');
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: 'not_found' });
});
