import type { Profile, User } from '@vigortally/schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createSession } from '../auth/sessions';
import { createTestApp } from '../test/app';
import { ADMIN, setUpAdmin, TestClient } from '../test/client';

let ctx: Awaited<ReturnType<typeof createTestApp>>;
beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.close());

describe('first-run setup', () => {
  test('is required on a fresh server and creates the admin', async () => {
    const anon = new TestClient(ctx.app);
    expect((await anon.get('/api/setup')).body).toEqual({ setupRequired: true });

    const res = await anon.post<User>('/api/setup', ADMIN);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
    expect(res.headers.get('set-cookie')).toMatch(/vt_session=.+HttpOnly/i);

    expect((await anon.get('/api/setup')).body).toEqual({ setupRequired: false });
    expect((await anon.get('/api/me')).status).toBe(200);
  });

  test('can only run once', async () => {
    await setUpAdmin(ctx.app);
    const res = await new TestClient(ctx.app).post('/api/setup', { ...ADMIN, email: 'x@y.de' });
    expect(res.status).toBe(409);
  });

  test('validates input', async () => {
    const res = await new TestClient(ctx.app).post<{ issues: { path: string }[] }>('/api/setup', {
      name: 'A',
      email: 'nope',
      password: '123',
    });
    expect(res.status).toBe(400);
    expect(res.body.issues.map((i) => i.path).sort()).toEqual(['email', 'password']);
  });
});

describe('login and logout', () => {
  beforeEach(async () => {
    await setUpAdmin(ctx.app);
  });

  test('rejects wrong passwords and unknown emails the same way', async () => {
    const client = new TestClient(ctx.app);
    const wrong = await client.post('/api/auth/login', { email: ADMIN.email, password: 'nope' });
    const unknown = await client.post('/api/auth/login', { email: 'who@x.de', password: 'nope' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  test('signs in case-insensitively and out again', async () => {
    const client = new TestClient(ctx.app);
    const res = await client.post('/api/auth/login', {
      email: 'ADMIN@example.com',
      password: ADMIN.password,
    });
    expect(res.status).toBe(200);
    expect((await client.get('/api/me')).status).toBe(200);

    expect((await client.post('/api/auth/logout')).status).toBe(204);
    expect(client.cookie).toBeUndefined();
    expect((await client.get('/api/me')).status).toBe(401);
  });

  test('locks out after repeated failures', async () => {
    const client = new TestClient(ctx.app);
    for (let i = 0; i < 10; i++) {
      await client.post('/api/auth/login', { email: ADMIN.email, password: 'wrong' });
    }
    const res = await client.post('/api/auth/login', {
      email: ADMIN.email,
      password: ADMIN.password,
    });
    expect(res.status).toBe(429);
  });

  test('accepts device Bearer tokens', async () => {
    const admin = await new TestClient(ctx.app).post<User>('/api/auth/login', {
      email: ADMIN.email,
      password: ADMIN.password,
    });
    const { token } = await createSession(ctx.db, admin.body.id, 'device', 'Phone', new Date());
    const device = new TestClient(ctx.app, token);
    expect((await device.get('/api/me')).status).toBe(200);
    expect((await new TestClient(ctx.app, 'bogus').get('/api/me')).status).toBe(401);
  });
});

describe('profile', () => {
  test('starts with defaults and merges partial updates', async () => {
    const client = await setUpAdmin(ctx.app);
    const me = await client.get<{ profile: Profile }>('/api/me');
    expect(me.body.profile.targets.kcal).toBe(2200);

    const res = await client.patch<Profile>('/api/me/profile', {
      units: 'imperial',
      targets: { protein: 180 },
    });
    expect(res.body).toMatchObject({ units: 'imperial', targets: { protein: 180, kcal: 2200 } });
    expect((await client.get<{ profile: Profile }>('/api/me')).body.profile.units).toBe('imperial');
  });

  test('password change signs out other sessions', async () => {
    const first = await setUpAdmin(ctx.app);
    const second = new TestClient(ctx.app);
    await second.post('/api/auth/login', { email: ADMIN.email, password: ADMIN.password });

    const wrong = await first.post('/api/me/password', {
      currentPassword: 'nope',
      newPassword: 'another password',
    });
    expect(wrong.status).toBe(400);

    const res = await first.post('/api/me/password', {
      currentPassword: ADMIN.password,
      newPassword: 'another password',
    });
    expect(res.status).toBe(204);
    expect((await first.get('/api/me')).status).toBe(200);
    expect((await second.get('/api/me')).status).toBe(401);
  });
});

describe('household members', () => {
  test('admins add and remove members; members cannot', async () => {
    const admin = await setUpAdmin(ctx.app);
    const created = await admin.post<User>('/api/users', {
      name: 'Partner',
      email: 'partner@example.com',
      password: 'partner password',
    });
    expect(created.status).toBe(201);
    expect(created.body.role).toBe('member');

    const duplicate = await admin.post('/api/users', {
      name: 'X',
      email: 'PARTNER@example.com',
      password: 'partner password',
    });
    expect(duplicate.status).toBe(409);

    const member = new TestClient(ctx.app);
    await member.post('/api/auth/login', {
      email: 'partner@example.com',
      password: 'partner password',
    });
    expect((await member.get<User[]>('/api/users')).body).toHaveLength(2);
    expect(
      (await member.post('/api/users', { name: 'Y', email: 'y@y.de', password: '12345678' }))
        .status,
    ).toBe(403);

    expect((await admin.delete(`/api/users/${created.body.id}`)).status).toBe(204);
    expect((await member.get('/api/me')).status).toBe(401);
  });

  test('admins cannot delete themselves', async () => {
    const admin = await setUpAdmin(ctx.app);
    const me = await admin.get<{ user: User }>('/api/me');
    expect((await admin.delete(`/api/users/${me.body.user.id}`)).status).toBe(400);
  });
});
