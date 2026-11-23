/**
 * Metric registry for the statistics dashboard. Each metric turns raw records into daily
 * values, then buckets them by day, week or month. Clients pick a metric by name; they
 * never send queries, so the dashboard can chart anything without exposing the database.
 */
import { startOfMonth, startOfWeek } from '@vigortally/core';
import type { Bucket, Metric, SeriesPoint } from '@vigortally/schema';

/** How daily values combine into a bucket and into the range summary. */
export type Aggregation = 'sum' | 'average' | 'latest' | 'max';

export interface MetricDefinition {
  label: string;
  unit: string;
  aggregation: Aggregation;
  /** Needs `exerciseId` / `activityTypeId` to be meaningful. */
  requires?: 'exercise';
}

export const metricDefinitions: Record<Metric, MetricDefinition> = {
  weight: { label: 'Body weight', unit: 'kg', aggregation: 'latest' },
  calories: { label: 'Calories', unit: 'kcal', aggregation: 'average' },
  protein: { label: 'Protein', unit: 'g', aggregation: 'average' },
  carbs: { label: 'Carbs', unit: 'g', aggregation: 'average' },
  fat: { label: 'Fat', unit: 'g', aggregation: 'average' },
  water: { label: 'Water', unit: 'ml', aggregation: 'average' },
  workouts: { label: 'Workouts', unit: 'workouts', aggregation: 'sum' },
  trainingVolume: { label: 'Training volume', unit: 'kg', aggregation: 'sum' },
  exerciseOneRepMax: {
    label: 'Estimated 1RM',
    unit: 'kg',
    aggregation: 'max',
    requires: 'exercise',
  },
  activitySessions: { label: 'Sessions', unit: 'sessions', aggregation: 'sum' },
  activityDuration: { label: 'Active time', unit: 'min', aggregation: 'sum' },
  activityDistance: { label: 'Distance', unit: 'km', aggregation: 'sum' },
};

export interface DailyValue {
  date: string;
  value: number;
}

function bucketStart(date: string, bucket: Bucket): string {
  if (bucket === 'week') return startOfWeek(date);
  if (bucket === 'month') return startOfMonth(date);
  return date;
}

function combine(values: number[], aggregation: Aggregation): number {
  switch (aggregation) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'average':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'max':
      return Math.max(...values);
    case 'latest':
      return values[values.length - 1]!;
  }
}

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Merges raw values per day (several workouts on one day add up; for `latest`/`average`
 * metrics the day's values are combined the same way), then per bucket.
 */
export function buildSeries(
  raw: readonly DailyValue[],
  bucket: Bucket,
  aggregation: Aggregation,
): { points: SeriesPoint[]; summary: number | null } {
  const daily = new Map<string, number[]>();
  for (const { date, value } of [...raw].sort((a, b) => a.date.localeCompare(b.date))) {
    daily.set(date, [...(daily.get(date) ?? []), value]);
  }
  // Counts and sums add up within a day; averages and latest values do the same as buckets.
  const perDay = [...daily].map(([date, values]) => ({
    date,
    value: combine(values, aggregation === 'average' ? 'sum' : aggregation),
  }));

  const buckets = new Map<string, number[]>();
  for (const { date, value } of perDay) {
    const key = bucketStart(date, bucket);
    buckets.set(key, [...(buckets.get(key) ?? []), value]);
  }
  const points = [...buckets].map(([date, values]) => ({
    date,
    value: round(combine(values, aggregation)),
  }));
  const summary =
    perDay.length === 0
      ? null
      : round(
          combine(
            perDay.map((d) => d.value),
            aggregation,
          ),
        );
  return { points, summary };
}

export const summaryLabels: Record<Aggregation, 'total' | 'average' | 'latest' | 'best'> = {
  sum: 'total',
  average: 'average',
  latest: 'latest',
  max: 'best',
};

/** Calendar date of a timestamp in the client's time zone (offset in minutes east of UTC). */
export function localDate(at: Date, offsetMinutes: number): string {
  return new Date(at.getTime() + offsetMinutes * 60_000).toISOString().slice(0, 10);
}
