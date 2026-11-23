import { z } from 'zod';
import { id, timestamp } from './common';

/**
 * How an activity is logged:
 * - `strength`: the set-and-rep workout logger
 * - `session`: a session with the activity's own fields (distance, duration, grade, …)
 */
export const activityKind = z.enum(['strength', 'session']);
export type ActivityKind = z.infer<typeof activityKind>;

export const fieldType = z.enum(['number', 'duration', 'distance', 'text']);
export type FieldType = z.infer<typeof fieldType>;

/** One value recorded per session, e.g. distance in km or the hardest grade. */
export const activityField = z.object({
  key: z
    .string()
    .regex(/^[a-z][a-zA-Z0-9]*$/, 'Use letters and digits, starting with a lowercase letter')
    .max(40),
  label: z.string().trim().min(1).max(40),
  type: fieldType,
  /** Display unit for `number` fields ("m", "rounds", "kcal"). */
  unit: z.string().trim().max(16).optional(),
});
export type ActivityField = z.infer<typeof activityField>;

export const activityType = z.object({
  id,
  name: z.string().trim().min(1).max(60),
  kind: activityKind,
  /** Preset this activity was created from, if any. */
  presetKey: z.string().max(40).nullable().default(null),
  /** Icon name (see the apps' icon map). */
  icon: z.string().max(40).default('activity'),
  fields: z.array(activityField).max(12).default([]),
  archived: z.boolean().default(false),
});
export type ActivityType = z.infer<typeof activityType>;
export const activityTypeInput = activityType;
export type ActivityTypeInput = z.input<typeof activityTypeInput>;

export const fieldValue = z.union([z.number().finite(), z.string().max(200)]);

export const activitySessionInput = z.object({
  id,
  activityTypeId: id,
  startedAt: timestamp,
  durationSec: z
    .number()
    .int()
    .min(0)
    .max(7 * 24 * 3600)
    .nullable()
    .default(null),
  /** Values keyed by the activity type's field keys. Distances in metres. */
  values: z.record(z.string(), fieldValue).default({}),
  notes: z.string().max(2000).default(''),
});
export type ActivitySessionInput = z.input<typeof activitySessionInput>;
export const activitySession = activitySessionInput.extend({
  source: z.string(),
});
export type ActivitySession = z.infer<typeof activitySession>;

// ---- strength ---------------------------------------------------------------

export const equipment = z.enum([
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
  'other',
]);
export type Equipment = z.infer<typeof equipment>;

export const muscleGroup = z.enum([
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'full_body',
  'cardio',
]);
export type MuscleGroup = z.infer<typeof muscleGroup>;

export const exercise = z.object({
  id,
  name: z.string().trim().min(1).max(80),
  equipment,
  muscle: muscleGroup,
  /** Built-in exercises are shared and read-only. */
  builtIn: z.boolean().default(false),
});
export type Exercise = z.infer<typeof exercise>;
export const exerciseInput = exercise.omit({ builtIn: true });
export type ExerciseInput = z.infer<typeof exerciseInput>;

/** W = warm-up, D = drop set, F = failure. */
export const setType = z.enum(['normal', 'warmup', 'drop', 'failure']);
export type SetType = z.infer<typeof setType>;

export const workoutSet = z.object({
  type: setType.default('normal'),
  weightKg: z.number().min(0).max(1000).nullable().default(null),
  reps: z.number().int().min(0).max(1000).nullable().default(null),
  /** Rate of perceived exertion, 1–10. */
  rpe: z.number().min(1).max(10).nullable().default(null),
  done: z.boolean().default(false),
});
export type WorkoutSet = z.infer<typeof workoutSet>;

export const workoutExercise = z.object({
  exerciseId: id,
  /** Exercises sharing a group number form a superset. */
  supersetGroup: z.number().int().min(1).nullable().default(null),
  note: z.string().max(200).default(''),
  sets: z.array(workoutSet).max(50),
});
export type WorkoutExercise = z.infer<typeof workoutExercise>;

export const workoutInput = z.object({
  id,
  name: z.string().trim().min(1).max(80),
  templateId: id.nullable().default(null),
  startedAt: timestamp,
  finishedAt: timestamp.nullable().default(null),
  notes: z.string().max(2000).default(''),
  exercises: z.array(workoutExercise).max(40),
});
export type WorkoutInput = z.input<typeof workoutInput>;
export const workout = workoutInput;
export type Workout = z.infer<typeof workout>;

export const templateInput = z.object({
  id,
  name: z.string().trim().min(1).max(80),
  notes: z.string().max(500).default(''),
  exercises: z.array(workoutExercise).max(40),
});
export type TemplateInput = z.input<typeof templateInput>;
export const template = templateInput.extend({
  lastPerformedAt: z.string().nullable(),
});
export type Template = z.infer<typeof template>;

/** Sets from the most recent workout with this exercise, for the PREVIOUS column. */
export const previousSets = z.record(z.string(), z.array(workoutSet));
export type PreviousSets = z.infer<typeof previousSets>;
