import { randomUUID } from 'node:crypto';
import { builtInExercises } from '@vigortally/core';
import type { Series, Widget } from '@vigortally/schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createTestApp } from '../test/app';
import { setUpAdmin, type TestClient } from '../test/client';

let ctx: Awaited<ReturnType<typeof createTestApp>>;
let client: TestClient;
beforeEach(async () => {
  ctx = await createTestApp();
  client = await setUpAdmin(ctx.app);
});
afterEach(() => ctx.close());

const squat = builtInExercises.find((e) => e.name === 'Squat')!;

async function workout(startedAt: string, weightKg: number, reps: number) {
  const id = randomUUID();
  const finishedAt = new Date(new Date(startedAt).getTime() + 3600_000).toISOString();
  await client.put(`/api/workouts/${id}`, {
    id,
    name: 'Legs',
    startedAt,
    finishedAt,
    exercises: [{ exerciseId: squat.id, sets: [{ weightKg, reps, done: true }] }],
  });
}

const series = (query: string) => client.get<Series>(`/api/stats/series?${query}`);

describe('series', () => {
  test('weight keeps the latest value per bucket', async () => {
    for (const [date, weightKg] of [
      ['2026-11-02', 82],
      ['2026-11-09', 81.5],
      ['2026-11-23', 80.8],
    ] as const) {
      const id = randomUUID();
      await client.put(`/api/weigh-ins/${id}`, { id, date, weightKg });
    }
    const res = await series('metric=weight&from=2026-11-01&to=2026-11-30&bucket=month');
    expect(res.body).toEqual({
      metric: 'weight',
      unit: 'kg',
      points: [{ date: '2026-11-01', value: 80.8 }],
      summary: 80.8,
      summaryLabel: 'latest',
    });
  });

  test('calories are daily totals averaged per bucket', async () => {
    for (const [date, kcal] of [
      ['2026-11-23', 1800],
      ['2026-11-23', 400],
      ['2026-11-24', 2000],
    ] as const) {
      const id = randomUUID();
      await client.put(`/api/diary/${id}`, {
        id,
        date,
        meal: 'lunch',
        quickAdd: { name: 'Food', nutrients: { kcal, protein: 0, carbs: 0, fat: 0 } },
      });
    }
    const daily = await series('metric=calories&from=2026-11-23&to=2026-11-29');
    expect(daily.body.points).toEqual([
      { date: '2026-11-23', value: 2200 },
      { date: '2026-11-24', value: 2000 },
    ]);
    expect(daily.body).toMatchObject({ summary: 2100, summaryLabel: 'average' });
  });

  test('training volume, workout count and estimated 1RM', async () => {
    await workout('2026-11-17T17:00:00.000Z', 100, 5);
    await workout('2026-11-24T17:00:00.000Z', 105, 5);
    await workout('2026-11-26T17:00:00.000Z', 100, 8);

    const volume = await series('metric=trainingVolume&from=2026-11-16&to=2026-11-30&bucket=week');
    expect(volume.body.points).toEqual([
      { date: '2026-11-16', value: 500 },
      { date: '2026-11-23', value: 1325 },
    ]);
    expect((await series('metric=workouts&from=2026-11-16&to=2026-11-30')).body.summary).toBe(3);

    const e1rm = await series(
      `metric=exerciseOneRepMax&exerciseId=${squat.id}&from=2026-11-16&to=2026-11-30&bucket=week`,
    );
    expect(e1rm.body.points.map((p) => p.value)).toEqual([116.7, 126.7]);
    expect(e1rm.body.summaryLabel).toBe('best');
  });

  test('dates follow the client time zone', async () => {
    await workout('2026-11-23T23:30:00.000Z', 100, 5);
    const utc = await series('metric=workouts&from=2026-11-23&to=2026-11-24');
    expect(utc.body.points[0]?.date).toBe('2026-11-23');
    const berlin = await series('metric=workouts&from=2026-11-23&to=2026-11-24&tzOffset=60');
    expect(berlin.body.points[0]?.date).toBe('2026-11-24');
  });

  test('activity metrics combine sessions and workouts, or filter by activity', async () => {
    const runId = randomUUID();
    await client.put(`/api/activity-types/${runId}`, {
      id: runId,
      name: 'Running',
      kind: 'session',
      fields: [{ key: 'distance', label: 'Distance', type: 'distance' }],
    });
    const sessionId = randomUUID();
    await client.put(`/api/activity-sessions/${sessionId}`, {
      id: sessionId,
      activityTypeId: runId,
      startedAt: '2026-11-22T08:00:00.000Z',
      durationSec: 1800,
      values: { distance: 5200 },
    });
    await workout('2026-11-23T17:00:00.000Z', 100, 5);

    const minutes = await series(
      'metric=activityDuration&from=2026-11-16&to=2026-11-30&bucket=week',
    );
    expect(minutes.body.summary).toBe(90);
    const runs = await series(
      `metric=activityDistance&activityTypeId=${runId}&from=2026-11-16&to=2026-11-30`,
    );
    expect(runs.body).toMatchObject({ unit: 'km', summary: 5.2 });
  });

  test('validates the query', async () => {
    expect((await series('metric=nope&from=2026-11-01&to=2026-11-30')).status).toBe(400);
    expect((await series('metric=weight&from=2026-12-01&to=2026-11-01')).status).toBe(400);
  });
});

describe('dashboard', () => {
  test('starts with default widgets that can be edited, reordered and removed', async () => {
    const first = await client.get<Widget[]>('/api/dashboard');
    expect(first.body.map((w) => w.metric)).toEqual([
      'weight',
      'calories',
      'workouts',
      'trainingVolume',
      'activityDuration',
    ]);
    // Defaults are created once.
    expect((await client.get<Widget[]>('/api/dashboard')).body.map((w) => w.id)).toEqual(
      first.body.map((w) => w.id),
    );

    const id = randomUUID();
    await client.put(`/api/dashboard/widgets/${id}`, {
      id,
      title: 'Protein',
      metric: 'protein',
      chart: 'line',
      rangeDays: 30,
      bucket: 'day',
    });
    const ids = (await client.get<Widget[]>('/api/dashboard')).body.map((w) => w.id);
    expect(ids.at(-1)).toBe(id);

    await client.put('/api/dashboard/order', { ids: [id, ...ids.slice(0, -1)] });
    await client.delete(`/api/dashboard/widgets/${ids[0]}`);
    const after = await client.get<Widget[]>('/api/dashboard');
    expect(after.body[0]?.title).toBe('Protein');
    expect(after.body).toHaveLength(5);
  });
});
