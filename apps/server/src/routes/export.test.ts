import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { createTestApp } from '../test/app';
import { setUpAdmin, TestClient } from '../test/client';

let ctx: Awaited<ReturnType<typeof createTestApp>>;
beforeEach(async () => {
  ctx = await createTestApp();
});
afterEach(() => ctx.close());

test("exports the user's data and the household's shared data, without secrets", async () => {
  const admin = await setUpAdmin(ctx.app);
  const w = randomUUID();
  await admin.put(`/api/weigh-ins/${w}`, { id: w, date: '2026-11-23', weightKg: 80.5 });
  const f = randomUUID();
  await admin.put(`/api/foods/${f}`, {
    id: f,
    name: 'Oats',
    per100g: { kcal: 370, protein: 13, carbs: 59, fat: 7 },
  });

  // A second member's private data must not leak into the admin's export.
  await admin.post('/api/users', { name: 'P', email: 'p@example.com', password: 'p password' });
  const partner = new TestClient(ctx.app);
  await partner.post('/api/auth/login', { email: 'p@example.com', password: 'p password' });
  const pw = randomUUID();
  await partner.put(`/api/weigh-ins/${pw}`, { id: pw, date: '2026-11-23', weightKg: 60 });

  interface ExportFile {
    format: number;
    user: { email: string };
    nutrition: { weighIns: { id: string; weightKg: number }[] };
    household: { foods: { name: string }[] };
  }
  const res = await admin.get<ExportFile>('/api/export');
  expect(res.status).toBe(200);
  expect(res.headers.get('content-disposition')).toMatch(
    /vigortally-export-\d{4}-\d{2}-\d{2}\.json/,
  );
  expect(res.body).toMatchObject({ format: 1, user: { email: 'admin@example.com' } });
  expect(res.body.nutrition.weighIns).toEqual([expect.objectContaining({ id: w, weightKg: 80.5 })]);
  expect(res.body.household.foods.map((x) => x.name)).toEqual(['Oats']);

  const text = JSON.stringify(res.body);
  expect(text).not.toMatch(/passwordHash|tokenHash|scrypt\$/);
  expect(text).not.toContain('"userId"');
});
