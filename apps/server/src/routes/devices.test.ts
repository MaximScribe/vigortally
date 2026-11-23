import type { Device, PairingCode, PairResult } from '@vigortally/schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createTestApp } from '../test/app';
import { setUpAdmin, TestClient } from '../test/client';
import { generatePairingCode, normalizeCode, PAIRING_TTL_MS } from './devices';

let now = new Date('2026-11-23T12:00:00Z');
let ctx: Awaited<ReturnType<typeof createTestApp>>;
let web: TestClient;
beforeEach(async () => {
  now = new Date('2026-11-23T12:00:00Z');
  ctx = await createTestApp({ now: () => now });
  web = await setUpAdmin(ctx.app);
});
afterEach(() => ctx.close());

test('codes are readable and normalise', () => {
  const code = generatePairingCode();
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  expect(normalizeCode(' abcd-efgh ')).toBe('ABCDEFGH');
});

describe('pairing', () => {
  test('a QR code pairs the companion app exactly once', async () => {
    const created = await web.post<PairingCode>('/api/devices/pairing');
    expect(created.status).toBe(201);
    expect(created.body.serverUrl).toBe('https://vt.example.ts.net');
    expect(created.body.link).toBe(
      `vigortally://pair?server=${encodeURIComponent('https://vt.example.ts.net')}&code=${created.body.code}`,
    );

    const phone = new TestClient(ctx.app);
    const paired = await phone.post<PairResult>('/api/devices/pair', {
      code: created.body.code.toLowerCase().replace('-', ''),
      deviceName: 'Pixel 9',
    });
    expect(paired.status).toBe(200);
    expect(paired.body.user.email).toBe('admin@example.com');

    phone.token = paired.body.token;
    expect((await phone.get('/api/me')).status).toBe(200);

    const again = await new TestClient(ctx.app).post('/api/devices/pair', {
      code: created.body.code,
      deviceName: 'Thief',
    });
    expect(again.status).toBe(400);
  });

  test('codes expire', async () => {
    const created = await web.post<PairingCode>('/api/devices/pairing');
    now = new Date(now.getTime() + PAIRING_TTL_MS + 1000);
    const res = await new TestClient(ctx.app).post('/api/devices/pair', {
      code: created.body.code,
      deviceName: 'Late phone',
    });
    expect(res.status).toBe(400);
  });

  test('a new code replaces the previous unused one', async () => {
    const first = await web.post<PairingCode>('/api/devices/pairing');
    await web.post<PairingCode>('/api/devices/pairing');
    const res = await new TestClient(ctx.app).post('/api/devices/pair', {
      code: first.body.code,
      deviceName: 'Phone',
    });
    expect(res.status).toBe(400);
  });

  test('creating codes needs a session', async () => {
    expect((await new TestClient(ctx.app).post('/api/devices/pairing')).status).toBe(401);
  });
});

describe('devices', () => {
  test('lists sessions and revokes a paired device', async () => {
    const created = await web.post<PairingCode>('/api/devices/pairing');
    const paired = await new TestClient(ctx.app).post<PairResult>('/api/devices/pair', {
      code: created.body.code,
      deviceName: 'Pixel 9',
    });
    const phone = new TestClient(ctx.app, paired.body.token);

    const list = await web.get<Device[]>('/api/devices');
    expect(list.body.map((d) => [d.name, d.kind, d.current])).toEqual(
      expect.arrayContaining([
        ['Pixel 9', 'device', false],
        [expect.any(String), 'web', true],
      ]),
    );

    const deviceId = list.body.find((d) => d.kind === 'device')!.id;
    expect((await web.delete(`/api/devices/${deviceId}`)).status).toBe(204);
    expect((await phone.get('/api/me')).status).toBe(401);
    expect((await web.delete('/api/devices/not-a-uuid')).status).toBe(404);
  });
});
