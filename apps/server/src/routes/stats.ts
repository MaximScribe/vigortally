import { randomUUID } from 'node:crypto';
import { estimateOneRepMax, isWorkingSet } from '@vigortally/core';
import {
  dashboardOrder,
  id as idSchema,
  seriesQuery,
  widgetInput,
  type Series,
  type Widget,
} from '@vigortally/schema';
import { and, eq, gte, inArray, isNotNull, lte, type SQL } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context';
import type { Database } from '../db/client';
import {
  activitySessions,
  activityTypes,
  dashboardWidgets,
  diaryEntries,
  waterEntries,
  weighIns,
  workouts,
} from '../db/schema';
import { fail, notFound } from '../http/errors';
import { readBody, readQuery } from '../http/validate';
import {
  buildSeries,
  localDate,
  metricDefinitions,
  summaryLabels,
  type DailyValue,
} from '../lib/metrics';

type SeriesParams = z.output<typeof seriesQuery> & { tzOffset: number };

function pathId(c: Context): string {
  const result = idSchema.safeParse(c.req.param('id'));
  if (!result.success) notFound();
  return result.data;
}

/** Raw daily values for one metric. */
async function loadValues(db: Database, userId: string, q: SeriesParams): Promise<DailyValue[]> {
  // Timestamps are compared with a day of slack on both sides, then filtered by local date.
  const fromTs = new Date(`${q.from}T00:00:00Z`);
  fromTs.setUTCDate(fromTs.getUTCDate() - 1);
  const toTs = new Date(`${q.to}T23:59:59Z`);
  toTs.setUTCDate(toTs.getUTCDate() + 1);
  const inRange = (v: DailyValue) => v.date >= q.from && v.date <= q.to;

  switch (q.metric) {
    case 'weight': {
      const rows = await db
        .select()
        .from(weighIns)
        .where(
          and(eq(weighIns.userId, userId), gte(weighIns.date, q.from), lte(weighIns.date, q.to)),
        );
      return rows.map((r) => ({ date: r.date, value: r.weightKg }));
    }
    case 'calories':
    case 'protein':
    case 'carbs':
    case 'fat': {
      const key = q.metric === 'calories' ? 'kcal' : q.metric;
      const rows = await db
        .select({ date: diaryEntries.date, nutrients: diaryEntries.nutrients })
        .from(diaryEntries)
        .where(
          and(
            eq(diaryEntries.userId, userId),
            gte(diaryEntries.date, q.from),
            lte(diaryEntries.date, q.to),
          ),
        );
      return rows.map((r) => ({ date: r.date, value: r.nutrients[key] }));
    }
    case 'water': {
      const rows = await db
        .select()
        .from(waterEntries)
        .where(
          and(
            eq(waterEntries.userId, userId),
            gte(waterEntries.date, q.from),
            lte(waterEntries.date, q.to),
          ),
        );
      return rows.map((r) => ({ date: r.date, value: r.ml }));
    }
    case 'workouts':
    case 'trainingVolume':
    case 'exerciseOneRepMax': {
      const rows = await loadWorkouts(db, userId, fromTs, toTs);
      if (q.metric === 'exerciseOneRepMax') {
        if (!q.exerciseId) return [];
        return rows
          .flatMap((w) => {
            const best = w.exercises
              .filter((e) => e.exerciseId === q.exerciseId)
              .flatMap((e) => e.sets.filter(isWorkingSet))
              .map((s) => estimateOneRepMax(s.weightKg, s.reps) ?? 0)
              .reduce((a, b) => Math.max(a, b), 0);
            return best > 0 ? [{ date: localDate(w.startedAt, q.tzOffset), value: best }] : [];
          })
          .filter(inRange);
      }
      return rows
        .map((w) => ({
          date: localDate(w.startedAt, q.tzOffset),
          value: q.metric === 'workouts' ? 1 : w.volumeKg,
        }))
        .filter(inRange);
    }
    case 'activitySessions':
    case 'activityDuration':
    case 'activityDistance': {
      let includeSessions = true;
      let includeWorkouts = true;
      const sessionFilter: SQL[] = [eq(activitySessions.userId, userId)];
      if (q.activityTypeId) {
        const [type] = await db
          .select({ kind: activityTypes.kind })
          .from(activityTypes)
          .where(and(eq(activityTypes.id, q.activityTypeId), eq(activityTypes.userId, userId)));
        includeWorkouts = type?.kind === 'strength';
        includeSessions = type?.kind === 'session';
        sessionFilter.push(eq(activitySessions.activityTypeId, q.activityTypeId));
      }
      const values: DailyValue[] = [];
      if (includeSessions) {
        const rows = await db
          .select()
          .from(activitySessions)
          .where(
            and(
              ...sessionFilter,
              gte(activitySessions.startedAt, fromTs),
              lte(activitySessions.startedAt, toTs),
            ),
          );
        for (const s of rows) {
          const date = localDate(s.startedAt, q.tzOffset);
          if (q.metric === 'activitySessions') values.push({ date, value: 1 });
          else if (q.metric === 'activityDuration' && s.durationSec)
            values.push({ date, value: s.durationSec / 60 });
          else if (q.metric === 'activityDistance' && typeof s.values.distance === 'number')
            values.push({ date, value: s.values.distance / 1000 });
        }
      }
      if (includeWorkouts && q.metric !== 'activityDistance') {
        for (const w of await loadWorkouts(db, userId, fromTs, toTs)) {
          const date = localDate(w.startedAt, q.tzOffset);
          if (q.metric === 'activitySessions') values.push({ date, value: 1 });
          else if (w.finishedAt)
            values.push({ date, value: (w.finishedAt.getTime() - w.startedAt.getTime()) / 60_000 });
        }
      }
      return values.filter(inRange);
    }
  }
}

function loadWorkouts(db: Database, userId: string, from: Date, to: Date) {
  return db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        isNotNull(workouts.finishedAt),
        gte(workouts.startedAt, from),
        lte(workouts.startedAt, to),
      ),
    );
}

type WidgetRow = typeof dashboardWidgets.$inferSelect;
function toWidget(row: WidgetRow): Widget {
  return {
    id: row.id,
    position: row.position,
    title: row.title,
    metric: row.metric as Widget['metric'],
    chart: row.chart as Widget['chart'],
    rangeDays: row.rangeDays,
    bucket: row.bucket as Widget['bucket'],
    exerciseId: row.exerciseId,
    activityTypeId: row.activityTypeId,
  };
}

/** What a new user's dashboard starts with. */
const defaultWidgets = [
  { title: 'Weight trend', metric: 'weight', chart: 'line', rangeDays: 90, bucket: 'day' },
  { title: 'Calories', metric: 'calories', chart: 'bar', rangeDays: 14, bucket: 'day' },
  {
    title: 'Workouts (30 days)',
    metric: 'workouts',
    chart: 'number',
    rangeDays: 30,
    bucket: 'day',
  },
  {
    title: 'Training volume',
    metric: 'trainingVolume',
    chart: 'bar',
    rangeDays: 84,
    bucket: 'week',
  },
  { title: 'Active time', metric: 'activityDuration', chart: 'bar', rangeDays: 84, bucket: 'week' },
] as const;

export function statsRoutes() {
  const app = new Hono<AppEnv>();

  app.get('/stats/metrics', (c) => c.json(metricDefinitions));

  app.get('/stats/series', async (c) => {
    const q = readQuery(
      c,
      seriesQuery.extend({ tzOffset: z.coerce.number().int().min(-840).max(840).default(0) }),
    );
    if (q.from > q.to) fail(400, 'invalid_range', '`from` must not be after `to`');
    const definition = metricDefinitions[q.metric];
    const values = await loadValues(c.var.db, c.var.user.id, q);
    const { points, summary } = buildSeries(values, q.bucket, definition.aggregation);
    return c.json<Series>({
      metric: q.metric,
      unit: definition.unit,
      points,
      summary,
      summaryLabel: summaryLabels[definition.aggregation],
    });
  });

  app.get('/dashboard', async (c) => {
    const userId = c.var.user.id;
    let rows = await c.var.db
      .select()
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.userId, userId))
      .orderBy(dashboardWidgets.position);
    if (rows.length === 0) {
      rows = await c.var.db
        .insert(dashboardWidgets)
        .values(defaultWidgets.map((w, position) => ({ ...w, id: randomUUID(), userId, position })))
        .onConflictDoNothing()
        .returning();
      rows.sort((a, b) => a.position - b.position);
    }
    return c.json(rows.map(toWidget));
  });

  app.put('/dashboard/widgets/:id', async (c) => {
    const id = pathId(c);
    const input = await readBody(c, widgetInput);
    if (input.id !== id) fail(400, 'id_mismatch');
    const userId = c.var.user.id;
    const existing = await c.var.db
      .select({ position: dashboardWidgets.position })
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.userId, userId));
    const position = existing.reduce((max, w) => Math.max(max, w.position + 1), 0);
    const fields = {
      title: input.title,
      metric: input.metric,
      chart: input.chart,
      rangeDays: input.rangeDays,
      bucket: input.bucket,
      exerciseId: input.exerciseId,
      activityTypeId: input.activityTypeId,
    };
    const [row] = await c.var.db
      .insert(dashboardWidgets)
      .values({ id, userId, position, ...fields })
      .onConflictDoUpdate({
        target: dashboardWidgets.id,
        set: fields,
        setWhere: eq(dashboardWidgets.userId, userId),
      })
      .returning();
    if (!row) fail(409, 'id_conflict');
    return c.json(toWidget(row));
  });

  app.put('/dashboard/order', async (c) => {
    const { ids } = await readBody(c, dashboardOrder);
    const userId = c.var.user.id;
    await c.var.db.transaction(async (tx) => {
      for (const [position, id] of ids.entries()) {
        await tx
          .update(dashboardWidgets)
          .set({ position })
          .where(and(eq(dashboardWidgets.id, id), eq(dashboardWidgets.userId, userId)));
      }
    });
    const rows = await c.var.db
      .select()
      .from(dashboardWidgets)
      .where(and(eq(dashboardWidgets.userId, userId), inArray(dashboardWidgets.id, ids)))
      .orderBy(dashboardWidgets.position);
    return c.json(rows.map(toWidget));
  });

  app.delete('/dashboard/widgets/:id', async (c) => {
    const id = pathId(c);
    await c.var.db
      .delete(dashboardWidgets)
      .where(and(eq(dashboardWidgets.id, id), eq(dashboardWidgets.userId, c.var.user.id)));
    return c.body(null, 204);
  });

  return app;
}
