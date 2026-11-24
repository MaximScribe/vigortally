import { defaultWorkoutName, type WorkoutDraft } from '@vigortally/core';
import type { WorkoutExercise, WorkoutSet } from '@vigortally/schema';

export { completedWorkout, emptySet, nextSetType } from '@vigortally/core';
import { useSyncExternalStore } from 'react';
import { newId } from '../lib/ids';

/** The workout currently being logged. Lives on this device until it is finished. */
export type ActiveWorkout = WorkoutDraft;

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

export function startWorkout(options: {
  name?: string;
  templateId?: string | null;
  exercises?: WorkoutExercise[];
  restSeconds?: number;
}): ActiveWorkout {
  const workout: ActiveWorkout = {
    id: newId(),
    name: options.name ?? defaultWorkoutName(),
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
