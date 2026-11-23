import { z } from 'zod';
import { id, isoDate } from './common';

/** Every metric the dashboard can chart. */
export const metric = z.enum([
  'weight',
  'calories',
  'protein',
  'carbs',
  'fat',
  'water',
  'workouts',
  'trainingVolume',
  'exerciseOneRepMax',
  'activitySessions',
  'activityDuration',
  'activityDistance',
]);
export type Metric = z.infer<typeof metric>;

export const bucket = z.enum(['day', 'week', 'month']);
export type Bucket = z.infer<typeof bucket>;

export const chartType = z.enum(['line', 'bar', 'number']);
export type ChartType = z.infer<typeof chartType>;

export const seriesQuery = z.object({
  metric,
  from: isoDate,
  to: isoDate,
  bucket: bucket.default('day'),
  /** Narrow `exerciseOneRepMax` to an exercise or `activity*` metrics to an activity. */
  exerciseId: id.optional(),
  activityTypeId: id.optional(),
});
export type SeriesQuery = z.input<typeof seriesQuery>;

export const seriesPoint = z.object({ date: isoDate, value: z.number() });
export type SeriesPoint = z.infer<typeof seriesPoint>;

export const series = z.object({
  metric,
  unit: z.string(),
  points: z.array(seriesPoint),
});
export type Series = z.infer<typeof series>;

export const widgetInput = z.object({
  id,
  title: z.string().trim().min(1).max(60),
  metric,
  chart: chartType,
  /** Days to show, counted back from today. */
  rangeDays: z.number().int().min(7).max(730),
  bucket,
  exerciseId: id.nullable().default(null),
  activityTypeId: id.nullable().default(null),
});
export type WidgetInput = z.input<typeof widgetInput>;
export const widget = widgetInput.extend({ position: z.number().int() });
export type Widget = z.infer<typeof widget>;

export const dashboardOrder = z.object({ ids: z.array(id).max(50) });
