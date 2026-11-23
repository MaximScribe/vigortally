import { randomUUID } from 'node:crypto';
import { builtInExercises } from '@vigortally/core';
import type {
  ActivitySession,
  ActivityTypeSummary,
  Exercise,
  PreviousSets,
  Template,
  Workout,
} from '@vigortally/schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createTestApp } from '../test/app';
import { setUpAdmin, TestClient } from '../test/client';

let ctx: Awaited<ReturnType<typeof createTestApp>>;
let client: TestClient;
beforeEach(async () => {
  ctx = await createTestApp();
  client = await setUpAdmin(ctx.app);
});
afterEach(() => ctx.close());

const bench = builtInExercises.find((e) => e.name === 'Bench Press' && e.equipment === 'dumbbell')!;
const row = builtInExercises.find((e) => e.name === 'Seated Row' && e.equipment === 'machine')!;

function workout(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    name: 'Upper',
    startedAt: '2026-11-20T17:00:00.000Z',
    finishedAt: '2026-11-20T18:00:00.000Z',
    exercises: [
      {
        exerciseId: bench.id,
        sets: [
          { type: 'warmup', weightKg: 10, reps: 12, done: true },
          { weightKg: 17.5, reps: 12, done: true },
          { weightKg: 17.5, reps: 10, done: true },
        ],
      },
    ],
    ...overrides,
  };
}

test('requires a session', async () => {
  expect((await new TestClient(ctx.app).get('/api/activity-types')).status).toBe(401);
});

describe('activity types and sessions', () => {
  test('creates activities from presets and summarises their sessions', async () => {
    const presets =
      await client.get<{ key: string; name: string; fields: unknown[] }[]>('/api/activity-presets');
    const running = presets.body.find((p) => p.key === 'running')!;

    const runningId = randomUUID();
    const put = await client.put(`/api/activity-types/${runningId}`, {
      id: runningId,
      name: running.name,
      kind: 'session',
      presetKey: 'running',
      icon: 'footprints',
      fields: running.fields,
    });
    expect(put.status).toBe(200);

    const session = {
      id: randomUUID(),
      activityTypeId: runningId,
      startedAt: '2026-11-22T08:00:00.000Z',
      durationSec: 1800,
      values: { distance: 5000, avgHeartRate: 152 },
    };
    const saved = await client.put<ActivitySession>(
      `/api/activity-sessions/${session.id}`,
      session,
    );
    expect(saved.body).toMatchObject({ ...session, notes: '', source: 'manual' });

    // Saving again with the same id updates instead of duplicating (offline retries).
    await client.put(`/api/activity-sessions/${session.id}`, { ...session, durationSec: 1750 });

    const types = await client.get<ActivityTypeSummary[]>('/api/activity-types');
    expect(types.body).toEqual([
      expect.objectContaining({ id: runningId, sessionCount: 1, lastAt: session.startedAt }),
    ]);

    const sessions = await client.get<ActivitySession[]>(
      `/api/activity-sessions?activityTypeId=${runningId}`,
    );
    expect(sessions.body.map((s) => s.durationSec)).toEqual([1750]);
  });

  test('rejects sessions for unknown activities', async () => {
    const id = randomUUID();
    const res = await client.put(`/api/activity-sessions/${id}`, {
      id,
      activityTypeId: randomUUID(),
      startedAt: '2026-11-22T08:00:00.000Z',
    });
    expect(res.status).toBe(400);
  });

  test("cannot overwrite another user's records", async () => {
    const id = randomUUID();
    const activity = { id, name: 'Mine', kind: 'session', fields: [] };
    await client.put(`/api/activity-types/${id}`, activity);

    await client.post('/api/users', {
      name: 'Other',
      email: 'other@example.com',
      password: 'other password',
    });
    const other = new TestClient(ctx.app);
    await other.post('/api/auth/login', { email: 'other@example.com', password: 'other password' });

    const res = await other.put(`/api/activity-types/${id}`, { ...activity, name: 'Stolen' });
    expect(res.status).toBe(409);
    expect((await other.get<unknown[]>('/api/activity-types')).body).toEqual([]);
    expect((await client.get<{ name: string }[]>('/api/activity-types')).body[0]?.name).toBe(
      'Mine',
    );
  });
});

describe('exercises', () => {
  test('lists built-in and custom exercises; built-ins are read-only', async () => {
    const id = randomUUID();
    await client.put(`/api/exercises/${id}`, {
      id,
      name: 'Zercher Squat',
      equipment: 'barbell',
      muscle: 'quads',
    });
    const list = await client.get<Exercise[]>('/api/exercises');
    expect(list.body.length).toBe(builtInExercises.length + 1);
    expect(list.body.find((e) => e.id === id)).toMatchObject({ builtIn: false });

    const res = await client.put(`/api/exercises/${bench.id}`, { ...bench, name: 'Hacked' });
    expect(res.status).toBe(403);
  });
});

describe('workouts and templates', () => {
  test('stores workouts with computed volume', async () => {
    const w = workout();
    const res = await client.put<Workout>(`/api/workouts/${w.id}`, w);
    expect(res.status).toBe(200);
    expect(res.body.volumeKg).toBe(17.5 * 12 + 17.5 * 10);
    expect(res.body.exercises[0]?.sets[1]).toEqual({
      type: 'normal',
      weightKg: 17.5,
      reps: 12,
      rpe: null,
      done: true,
    });

    const list = await client.get<Workout[]>('/api/workouts');
    expect(list.body.map((x) => x.id)).toEqual([w.id]);
  });

  test('unfinished workouts are not listed', async () => {
    const w = workout({ finishedAt: null });
    await client.put(`/api/workouts/${w.id}`, w);
    expect((await client.get<Workout[]>('/api/workouts')).body).toEqual([]);
    expect((await client.get(`/api/workouts/${w.id}`)).status).toBe(200);
  });

  test('previous sets come from the latest workout containing each exercise', async () => {
    const older = workout({
      startedAt: '2026-11-10T17:00:00.000Z',
      finishedAt: '2026-11-10T18:00:00.000Z',
      exercises: [{ exerciseId: row.id, sets: [{ weightKg: 50, reps: 10, done: true }] }],
    });
    const newer = workout();
    await client.put(`/api/workouts/${older.id}`, older);
    await client.put(`/api/workouts/${newer.id}`, newer);

    const res = await client.get<PreviousSets>(
      `/api/workouts/previous?exerciseIds=${bench.id},${row.id}`,
    );
    expect(res.body[bench.id]).toHaveLength(3);
    expect(res.body[row.id]?.[0]).toMatchObject({ weightKg: 50, reps: 10 });
  });

  test('templates report when they were last performed', async () => {
    const templateId = randomUUID();
    await client.put(`/api/templates/${templateId}`, {
      id: templateId,
      name: 'Upper',
      notes: 'After climbing',
      exercises: [{ exerciseId: bench.id, sets: [{}, {}, {}, {}] }],
    });
    expect((await client.get<Template[]>('/api/templates')).body[0]?.lastPerformedAt).toBeNull();

    const w = workout({ templateId });
    await client.put(`/api/workouts/${w.id}`, w);
    const templates = await client.get<Template[]>('/api/templates');
    expect(templates.body[0]).toMatchObject({
      name: 'Upper',
      notes: 'After climbing',
      lastPerformedAt: w.startedAt,
    });
  });

  test('a strength activity counts finished workouts', async () => {
    const id = randomUUID();
    await client.put(`/api/activity-types/${id}`, {
      id,
      name: 'Strength training',
      kind: 'strength',
      presetKey: 'strength',
    });
    const w = workout();
    await client.put(`/api/workouts/${w.id}`, w);
    const types = await client.get<ActivityTypeSummary[]>('/api/activity-types');
    expect(types.body[0]).toMatchObject({ sessionCount: 1, lastAt: w.startedAt });
  });
});
