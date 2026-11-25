/**
 * Helpers for a workout that is being logged, shared by the web and companion apps.
 */
import type { SetType, WorkoutExercise, WorkoutSet } from '@vigortally/schema';

/** The workout currently being logged on a device. */
export interface WorkoutDraft {
  id: string;
  name: string;
  templateId: string | null;
  startedAt: string;
  notes: string;
  exercises: WorkoutExercise[];
  /** Rest timer: epoch ms when the current rest ends, or null. */
  restEndsAt: number | null;
  /** Rest length started after each completed set, in seconds (0 = off). */
  restSeconds: number;
}

export const emptySet = (type: SetType = 'normal'): WorkoutSet => ({
  type,
  weightKg: null,
  reps: null,
  rpe: null,
  done: false,
});

const setTypeOrder: SetType[] = ['normal', 'warmup', 'drop', 'failure'];

/** Tapping the set label cycles normal → warm-up → drop → failure. */
export function nextSetType(type: SetType): SetType {
  return setTypeOrder[(setTypeOrder.indexOf(type) + 1) % setTypeOrder.length]!;
}

/** "Morning workout" / "Afternoon workout" / "Evening workout". */
export function defaultWorkoutName(at: Date = new Date()): string {
  const hour = at.getHours();
  return hour < 11 ? 'Morning workout' : hour < 17 ? 'Afternoon workout' : 'Evening workout';
}

/** A new exercise in the logger starts with three empty sets. */
export function newWorkoutExercise(exerciseId: string): WorkoutExercise {
  return { exerciseId, supersetGroup: null, note: '', sets: [emptySet(), emptySet(), emptySet()] };
}

/** Template exercises become logger exercises with unchecked sets. */
export function exercisesFromTemplate(exercises: readonly WorkoutExercise[]): WorkoutExercise[] {
  return exercises.map((e) => ({
    ...e,
    sets: e.sets.map((s) => ({ ...emptySet(s.type), weightKg: s.weightKg, reps: s.reps })),
  }));
}

/**
 * Checking an empty set takes last time's numbers, like copying from a paper log.
 */
export function completeSet(set: WorkoutSet, previous: WorkoutSet | undefined): WorkoutSet {
  return {
    ...set,
    done: true,
    weightKg: set.weightKg ?? previous?.weightKg ?? null,
    reps: set.reps ?? previous?.reps ?? null,
  };
}

/** The workout as it gets saved: only completed sets, only exercises that have one. */
export function completedWorkout(workout: WorkoutDraft, finishedAt: Date) {
  return {
    id: workout.id,
    name: workout.name.trim() || 'Workout',
    templateId: workout.templateId,
    startedAt: workout.startedAt,
    finishedAt: finishedAt.toISOString(),
    notes: workout.notes.trim(),
    exercises: workout.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
      .filter((e) => e.sets.length > 0),
  };
}
