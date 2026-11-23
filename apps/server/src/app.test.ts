import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { ServerInfo } from './app';
import { API_VERSION, SERVER_VERSION } from './meta';
import { createTestApp } from './test/app';
import { setUpAdmin } from './test/client';

let ctx: Awaited<ReturnType<typeof createTestApp>>;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(() => ctx.close());

describe('GET /api/health', () => {
  test('reports ok with a working database', async () => {
    const res = await ctx.app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', database: 'ok' });
  });
});

describe('GET /api/info', () => {
  test('describes the server for companion apps', async () => {
    const res = await ctx.app.request('/api/info');
    expect(res.status).toBe(200);
    const info = (await res.json()) as ServerInfo;
    expect(info).toMatchObject({
      name: 'VigorTally',
      version: SERVER_VERSION,
      apiVersion: API_VERSION,
    });
  });
});

test('unknown API routes need a session and then return a JSON 404', async () => {
  expect((await ctx.app.request('/api/does-not-exist')).status).toBe(401);
  const client = await setUpAdmin(ctx.app);
  const res = await client.get('/api/does-not-exist');
  expect(res.status).toBe(404);
  expect(res.body).toEqual({ error: 'not_found' });
});
