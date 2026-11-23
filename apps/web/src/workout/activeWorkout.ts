import type { SetType, WorkoutExercise, WorkoutSet } from '@vigortally/schema';
import { useSyncExternalStore } from 'react';
import { newId } from '../lib/ids';

/** The workout currently being logged. Lives on this device until it is finished. */
export interface ActiveWorkout {
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

const STORAGE_KEY = 'vigortally.activeWorkout';
const listeners = new Set<() => void>();

function read(): ActiveWorkout | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveWorkout) : null;
  } catch {
    return null;
  }
}

let current: ActiveWorkout | null = read();

function write(next: ActiveWorkout | null) {
  current = next;
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: the workout still works until the tab is closed.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useActiveWorkout(): ActiveWorkout | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
}

export function getActiveWorkout(): ActiveWorkout | null {
  return current;
}

export const emptySet = (type: SetType = 'normal'): WorkoutSet => ({
  type,
  weightKg: null,
  reps: null,
  rpe: null,
  done: false,
});

export function startWorkout(options: {
  name?: string;
  templateId?: string | null;
  exercises?: WorkoutExercise[];
  restSeconds?: number;
}): ActiveWorkout {
  const hour = new Date().getHours();
  const workout: ActiveWorkout = {
    id: newId(),
    name:
      options.name ??
      (hour < 11 ? 'Morning workout' : hour < 17 ? 'Afternoon workout' : 'Evening workout'),
    templateId: options.templateId ?? null,
    startedAt: new Date().toISOString(),
    notes: '',
    exercises: options.exercises ?? [],
    restEndsAt: null,
    restSeconds: options.restSeconds ?? current?.restSeconds ?? 90,
  };
  write(workout);
  return workout;
}

export function updateWorkout(update: (workout: ActiveWorkout) => ActiveWorkout): void {
  if (current) write(update(current));
}

export function discardWorkout(): void {
  write(null);
}

/** Replaces one exercise (by index) using `update`. */
export function updateExercise(
  index: number,
  update: (exercise: WorkoutExercise) => WorkoutExercise,
): void {
  updateWorkout((w) => ({
    ...w,
    exercises: w.exercises.map((e, i) => (i === index ? update(e) : e)),
  }));
}

export function updateSet(
  exerciseIndex: number,
  setIndex: number,
  patch: Partial<WorkoutSet>,
): void {
  updateExercise(exerciseIndex, (e) => ({
    ...e,
    sets: e.sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s)),
  }));
}

const setTypeOrder: SetType[] = ['normal', 'warmup', 'drop', 'failure'];
export function nextSetType(type: SetType): SetType {
  return setTypeOrder[(setTypeOrder.indexOf(type) + 1) % setTypeOrder.length]!;
}

/**
 * The workout as it gets saved: only completed sets, only exercises that have one.
 */
export function completedWorkout(workout: ActiveWorkout, finishedAt: Date) {
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
