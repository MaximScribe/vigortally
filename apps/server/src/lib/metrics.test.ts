import { describe, expect, test } from 'vitest';
import { buildSeries, localDate } from './metrics';

describe('buildSeries', () => {
  const raw = [
    { date: '2026-11-23', value: 1000 }, // Monday
    { date: '2026-11-23', value: 500 }, // second workout the same day
    { date: '2026-11-25', value: 2000 },
    { date: '2026-12-01', value: 700 }, // next week
  ];

  test('sums per day and per week', () => {
    expect(buildSeries(raw, 'day', 'sum').points).toEqual([
      { date: '2026-11-23', value: 1500 },
      { date: '2026-11-25', value: 2000 },
      { date: '2026-12-01', value: 700 },
    ]);
    const weekly = buildSeries(raw, 'week', 'sum');
    expect(weekly.points).toEqual([
      { date: '2026-11-23', value: 3500 },
      { date: '2026-11-30', value: 700 },
    ]);
    expect(weekly.summary).toBe(4200);
  });

  test('averages daily totals (e.g. calories per logged day)', () => {
    const result = buildSeries(raw, 'week', 'average');
    expect(result.points[0]).toEqual({ date: '2026-11-23', value: 1750 });
    expect(result.summary).toBe(Math.round(((1500 + 2000 + 700) / 3) * 10) / 10);
  });

  test('latest and max', () => {
    const weights = [
      { date: '2026-11-01', value: 82 },
      { date: '2026-11-15', value: 81.2 },
      { date: '2026-11-29', value: 80.4 },
    ];
    expect(buildSeries(weights, 'month', 'latest')).toEqual({
      points: [{ date: '2026-11-01', value: 80.4 }],
      summary: 80.4,
    });
    expect(buildSeries(weights, 'month', 'max').summary).toBe(82);
  });

  test('empty input', () => {
    expect(buildSeries([], 'day', 'sum')).toEqual({ points: [], summary: null });
  });
});

test('localDate shifts timestamps into the client time zone', () => {
  const lateEvening = new Date('2026-11-23T23:30:00Z');
  expect(localDate(lateEvening, 0)).toBe('2026-11-23');
  expect(localDate(lateEvening, 60)).toBe('2026-11-24');
  expect(localDate(new Date('2026-11-24T02:00:00Z'), -300)).toBe('2026-11-23');
});
