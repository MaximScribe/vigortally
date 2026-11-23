import { activityPresets, builtInExercises, workoutVolume } from '@vigortally/core';
import {
  activitySessionInput,
  activityTypeInput,
  exerciseInput,
  id as idSchema,
  templateInput,
  workoutInput,
  type ActivitySession,
  type ActivityTypeSummary,
  type Exercise,
  type PreviousSets,
  type Template,
  type Workout,
} from '@vigortally/schema';
import { and, count, desc, eq, gte, isNotNull, lt, lte, max, sql } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context';
import {
  activitySessions,
  activityTypes,
  exercises,
  workoutTemplates,
  workouts,
} from '../db/schema';
import { fail, notFound } from '../http/errors';
import { readBody, readQuery } from '../http/validate';

const builtInIds = new Set(builtInExercises.map((e) => e.id));

function pathId(c: Context): string {
  const result = idSchema.safeParse(c.req.param('id'));
  if (!result.success) notFound();
  return result.data;
}

/** Client sends ids; a conflicting id owned by someone else must not be overwritten. */
function ensureWritten<T>(rows: T[]): T {
  const [row] = rows;
  if (!row) fail(409, 'id_conflict', 'This id belongs to another record');
  return row;
}

type WorkoutRow = typeof workouts.$inferSelect;
function toWorkout(row: WorkoutRow): Workout {
  return {
    id: row.id,
    name: row.name,
    templateId: row.templateId,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    notes: row.notes,
    exercises: row.exercises,
    volumeKg: row.volumeKg,
  };
}

type SessionRow = typeof activitySessions.$inferSelect;
function toSession(row: SessionRow): ActivitySession {
  return {
    id: row.id,
    activityTypeId: row.activityTypeId,
    startedAt: row.startedAt.toISOString(),
    durationSec: row.durationSec,
    values: row.values,
    notes: row.notes,
    source: row.source,
  };
}

const listQuery = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  activityTypeId: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export function activityRoutes() {
  const app = new Hono<AppEnv>();

  // ---- presets and activity types --------------------------------------------

  app.get('/activity-presets', (c) => c.json(activityPresets));

  app.get('/activity-types', async (c) => {
    const userId = c.var.user.id;
    const types = await c.var.db
      .select()
      .from(activityTypes)
      .where(eq(activityTypes.userId, userId))
      .orderBy(activityTypes.createdAt);

    const sessionStats = await c.var.db
      .select({
        activityTypeId: activitySessions.activityTypeId,
        n: count(),
        last: max(activitySessions.startedAt),
      })
      .from(activitySessions)
      .where(eq(activitySessions.userId, userId))
      .groupBy(activitySessions.activityTypeId);
    const [workoutStats] = await c.var.db
      .select({ n: count(), last: max(workouts.startedAt) })
      .from(workouts)
      .where(and(eq(workouts.userId, userId), isNotNull(workouts.finishedAt)));

    const byType = new Map(sessionStats.map((s) => [s.activityTypeId, s]));
    const result: ActivityTypeSummary[] = types.map((t) => {
      const stats =
        t.kind === 'strength'
          ? { n: workoutStats?.n ?? 0, last: workoutStats?.last ?? null }
          : (byType.get(t.id) ?? { n: 0, last: null });
      return {
        id: t.id,
        name: t.name,
        kind: t.kind,
        presetKey: t.presetKey,
        icon: t.icon,
        fields: t.fields,
        archived: t.archived,
        sessionCount: stats.n,
        lastAt: stats.last ? new Date(stats.last).toISOString() : null,
      };
    });
    return c.json(result);
  });

  app.put('/activity-types/:id', async (c) => {
    const id = pathId(c);
    const input = await readBody(c, activityTypeInput);
    if (input.id !== id) fail(400, 'id_mismatch');
    const values = { ...input, userId: c.var.user.id };
    const { id: _id, userId: _userId, ...update } = values;
    ensureWritten(
      await c.var.db
        .insert(activityTypes)
        .values(values)
        .onConflictDoUpdate({
          target: activityTypes.id,
          set: update,
          setWhere: eq(activityTypes.userId, c.var.user.id),
        })
        .returning({ id: activityTypes.id }),
    );
    return c.json(input);
  });

  app.delete('/activity-types/:id', async (c) => {
    const id = pathId(c);
    await c.var.db
      .delete(activityTypes)
      .where(and(eq(activityTypes.id, id), eq(activityTypes.userId, c.var.user.id)));
    return c.body(null, 204);
  });

  // ---- sessions ----------------------------------------------------------------

  app.get('/activity-sessions', async (c) => {
    const q = readQuery(c, listQuery);
    const conditions = [eq(activitySessions.userId, c.var.user.id)];
    if (q.activityTypeId) conditions.push(eq(activitySessions.activityTypeId, q.activityTypeId));
    if (q.from) conditions.push(gte(activitySessions.startedAt, new Date(`${q.from}T00:00:00Z`)));
    if (q.to) conditions.push(lte(activitySessions.startedAt, new Date(`${q.to}T23:59:59Z`)));
    const rows = await c.var.db
      .select()
      .from(activitySessions)
      .where(and(...conditions))
      .orderBy(desc(activitySessions.startedAt))
      .limit(q.limit);
    return c.json(rows.map(toSession));
  });

  app.put('/activity-sessions/:id', async (c) => {
    const id = pathId(c);
    const input = await readBody(c, activitySessionInput);
    if (input.id !== id) fail(400, 'id_mismatch');
    const [type] = await c.var.db
      .select({ id: activityTypes.id })
      .from(activityTypes)
      .where(
        and(eq(activityTypes.id, input.activityTypeId), eq(activityTypes.userId, c.var.user.id)),
      );
    if (!type) fail(400, 'unknown_activity', 'Activity not found');

    const values = {
      id,
      userId: c.var.user.id,
      activityTypeId: input.activityTypeId,
      startedAt: new Date(input.startedAt),
      durationSec: input.durationSec,
      values: input.values,
      notes: input.notes,
    };
    const { id: _id, userId: _userId, ...update } = values;
    const row = ensureWritten(
      await c.var.db
        .insert(activitySessions)
        .values(values)
        .onConflictDoUpdate({
          target: activitySessions.id,
          set: update,
          setWhere: eq(activitySessions.userId, c.var.user.id),
        })
        .returning(),
    );
    return c.json(toSession(row));
  });

  app.delete('/activity-sessions/:id', async (c) => {
    const id = pathId(c);
    await c.var.db
      .delete(activitySessions)
      .where(and(eq(activitySessions.id, id), eq(activitySessions.userId, c.var.user.id)));
    return c.body(null, 204);
  });

  // ---- exercises -----------------------------------------------------------------

  app.get('/exercises', async (c) => {
    const custom = await c.var.db
      .select()
      .from(exercises)
      .where(eq(exercises.userId, c.var.user.id));
    const result: Exercise[] = [
      ...builtInExercises,
      ...custom.map((e) => ({
        id: e.id,
        name: e.name,
        equipment: e.equipment as Exercise['equipment'],
        muscle: e.muscle as Exercise['muscle'],
        builtIn: false,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name) || a.equipment.localeCompare(b.equipment));
    return c.json(result);
  });

  app.put('/exercises/:id', async (c) => {
    const id = pathId(c);
    if (builtInIds.has(id)) fail(403, 'built_in', "Built-in exercises can't be changed");
    const input = await readBody(c, exerciseInput);
    if (input.id !== id) fail(400, 'id_mismatch');
    const values = { ...input, userId: c.var.user.id };
    ensureWritten(
      await c.var.db
        .insert(exercises)
        .values(values)
        .onConflictDoUpdate({
          target: exercises.id,
          set: { name: input.name, equipment: input.equipment, muscle: input.muscle },
          setWhere: eq(exercises.userId, c.var.user.id),
        })
        .returning({ id: exercises.id }),
    );
    return c.json({ ...input, builtIn: false });
  });

  app.delete('/exercises/:id', async (c) => {
    const id = pathId(c);
    await c.var.db
      .delete(exercises)
      .where(and(eq(exercises.id, id), eq(exercises.userId, c.var.user.id)));
    return c.body(null, 204);
  });

  // ---- templates -------------------------------------------------------------------

  app.get('/templates', async (c) => {
    const userId = c.var.user.id;
    const rows = await c.var.db
      .select({
        template: workoutTemplates,
        lastPerformedAt: max(workouts.startedAt),
      })
      .from(workoutTemplates)
      .leftJoin(
        workouts,
        and(eq(workouts.templateId, workoutTemplates.id), isNotNull(workouts.finishedAt)),
      )
      .where(eq(workoutTemplates.userId, userId))
      .groupBy(workoutTemplates.id)
      .orderBy(workoutTemplates.createdAt);
    const result: Template[] = rows.map(({ template, lastPerformedAt }) => ({
      id: template.id,
      name: template.name,
      notes: template.notes,
      exercises: template.exercises,
      lastPerformedAt: lastPerformedAt ? new Date(lastPerformedAt).toISOString() : null,
    }));
    return c.json(result);
  });

  app.put('/templates/:id', async (c) => {
    const id = pathId(c);
    const input = await readBody(c, templateInput);
    if (input.id !== id) fail(400, 'id_mismatch');
    ensureWritten(
      await c.var.db
        .insert(workoutTemplates)
        .values({ ...input, userId: c.var.user.id })
        .onConflictDoUpdate({
          target: workoutTemplates.id,
          set: { name: input.name, notes: input.notes, exercises: input.exercises },
          setWhere: eq(workoutTemplates.userId, c.var.user.id),
        })
        .returning({ id: workoutTemplates.id }),
    );
    return c.json(input);
  });

  app.delete('/templates/:id', async (c) => {
    const id = pathId(c);
    await c.var.db
      .delete(workoutTemplates)
      .where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, c.var.user.id)));
    return c.body(null, 204);
  });

  // ---- workouts --------------------------------------------------------------------

  app.get('/workouts', async (c) => {
    const q = readQuery(
      c,
      z.object({
        before: z.iso.datetime({ offset: true }).optional(),
        limit: z.coerce.number().int().min(1).max(200).default(30),
      }),
    );
    const conditions = [eq(workouts.userId, c.var.user.id), isNotNull(workouts.finishedAt)];
    if (q.before) conditions.push(lt(workouts.startedAt, new Date(q.before)));
    const rows = await c.var.db
      .select()
      .from(workouts)
      .where(and(...conditions))
      .orderBy(desc(workouts.startedAt))
      .limit(q.limit);
    return c.json(rows.map(toWorkout));
  });

  /** Most recent sets per exercise, for the PREVIOUS column of the logger. */
  app.get('/workouts/previous', async (c) => {
    const { exerciseIds } = readQuery(
      c,
      z.object({ exerciseIds: z.string().max(4000).default('') }),
    );
    const wanted = new Set(exerciseIds.split(',').filter(Boolean));
    const result: PreviousSets = {};
    if (wanted.size === 0) return c.json(result);

    // Walk back through recent workouts until every exercise is found (or history ends).
    const rows = await c.var.db
      .select({ exercises: workouts.exercises })
      .from(workouts)
      .where(and(eq(workouts.userId, c.var.user.id), isNotNull(workouts.finishedAt)))
      .orderBy(desc(workouts.startedAt))
      .limit(200);
    for (const row of rows) {
      for (const exercise of row.exercises) {
        if (wanted.has(exercise.exerciseId) && !(exercise.exerciseId in result)) {
          result[exercise.exerciseId] = exercise.sets;
        }
      }
      if (Object.keys(result).length === wanted.size) break;
    }
    return c.json(result);
  });

  app.get('/workouts/:id', async (c) => {
    const id = pathId(c);
    const [row] = await c.var.db
      .select()
      .from(workouts)
      .where(and(eq(workouts.id, id), eq(workouts.userId, c.var.user.id)));
    if (!row) notFound('Workout not found');
    return c.json(toWorkout(row));
  });

  app.put('/workouts/:id', async (c) => {
    const id = pathId(c);
    const input = await readBody(c, workoutInput);
    if (input.id !== id) fail(400, 'id_mismatch');
    if (input.finishedAt && input.finishedAt < input.startedAt) {
      fail(400, 'invalid_times', 'A workout must finish after it starts');
    }
    const values = {
      id,
      userId: c.var.user.id,
      templateId: input.templateId,
      name: input.name,
      startedAt: new Date(input.startedAt),
      finishedAt: input.finishedAt ? new Date(input.finishedAt) : null,
      notes: input.notes,
      exercises: input.exercises,
      volumeKg: workoutVolume(input.exercises),
      updatedAt: sql`now()`,
    };
    const { id: _id, userId: _userId, ...update } = values;
    const row = ensureWritten(
      await c.var.db
        .insert(workouts)
        .values(values)
        .onConflictDoUpdate({
          target: workouts.id,
          set: update,
          setWhere: eq(workouts.userId, c.var.user.id),
        })
        .returning(),
    );
    return c.json(toWorkout(row));
  });

  app.delete('/workouts/:id', async (c) => {
    const id = pathId(c);
    await c.var.db
      .delete(workouts)
      .where(and(eq(workouts.id, id), eq(workouts.userId, c.var.user.id)));
    return c.body(null, 204);
  });

  return app;
}
