import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { createTestApp } from './test/app';
import { mountWebApp } from './web';

let dir: string;
let ctx: Awaited<ReturnType<typeof createTestApp>>;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'vt-web-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>VigorTally</title>');
  writeFileSync(join(dir, 'assets', 'app-abc123.js'), 'console.log("hi")');
  ctx = await createTestApp();
  expect(mountWebApp(ctx.app, dir)).toBe(true);
});
afterAll(async () => {
  await ctx.close();
  rmSync(dir, { recursive: true, force: true });
});

test('serves index.html for the app and client-side routes', async () => {
  for (const path of ['/', '/nutrition', '/activities/abc']) {
    const res = await ctx.app.request(path);
    expect(res.status, path).toBe(200);
    expect(await res.text()).toContain('<title>VigorTally</title>');
    expect(res.headers.get('cache-control')).toBe('no-cache');
  }
});

test('serves fingerprinted assets with long caching', async () => {
  const res = await ctx.app.request('/assets/app-abc123.js');
  expect(res.status).toBe(200);
  expect(res.headers.get('cache-control')).toContain('immutable');
});

test('the API keeps working and responses carry security headers', async () => {
  const res = await ctx.app.request('/api/info');
  expect(res.status).toBe(200);
  expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  expect((await ctx.app.request('/api/unknown')).status).toBe(401);
});

test('returns false when there is no build', () => {
  expect(mountWebApp(ctx.app, join(dir, 'missing'))).toBe(false);
});
