import { defaultWorkoutName, type WorkoutDraft } from '@vigortally/core';
import type { WorkoutExercise } from '@vigortally/schema';
import { useSyncExternalStore } from 'react';
import { kv } from './storage';

/** The workout being logged on this phone. Survives app restarts until it's finished. */
const KEY = 'vigortally.activeWorkout';
const listeners = new Set<() => void>();
let current: WorkoutDraft | null = null;
let loaded = false;

function emit() {
  for (const l of listeners) l();
}

export async function loadActiveWorkout(): Promise<void> {
  if (loaded) return;
  loaded = true;
  const raw = await kv.getItem(KEY);
  current = raw ? (JSON.parse(raw) as WorkoutDraft) : null;
  emit();
}

function save(next: WorkoutDraft | null) {
  current = next;
  emit();
  void (next ? kv.setItem(KEY, JSON.stringify(next)) : kv.removeItem(KEY));
}

export function useActiveWorkout(): WorkoutDraft | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

export function startWorkout(options: {
  id: string;
  name?: string;
  templateId?: string | null;
  exercises?: WorkoutExercise[];
}): void {
  save({
    id: options.id,
    name: options.name ?? defaultWorkoutName(),
    templateId: options.templateId ?? null,
    startedAt: new Date().toISOString(),
    notes: '',
    exercises: options.exercises ?? [],
    restEndsAt: null,
    restSeconds: current?.restSeconds ?? 90,
  });
}

export function updateWorkout(update: (w: WorkoutDraft) => WorkoutDraft): void {
  if (current) save(update(current));
}

export function discardWorkout(): void {
  save(null);
}
