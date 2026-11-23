import type { WorkoutExercise, WorkoutSet } from '@vigortally/schema';

/**
 * Estimated one-rep max (Epley formula). A single rep is the weight itself.
 * Returns null for sets without weight or reps.
 */
export function estimateOneRepMax(weightKg: number | null, reps: number | null): number | null {
  if (weightKg == null || reps == null || reps <= 0 || weightKg <= 0) return null;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** Sets that count towards stats: completed and not warm-ups. */
export function isWorkingSet(set: WorkoutSet): boolean {
  return set.done && set.type !== 'warmup';
}

/** Total weight moved (weight × reps) over working sets. */
export function volume(sets: readonly WorkoutSet[]): number {
  return sets
    .filter(isWorkingSet)
    .reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
}

export function workoutVolume(exercises: readonly WorkoutExercise[]): number {
  return exercises.reduce((sum, exercise) => sum + volume(exercise.sets), 0);
}

/** The working set with the highest estimated one-rep max. */
export function bestSet(sets: readonly WorkoutSet[]): WorkoutSet | null {
  let best: WorkoutSet | null = null;
  let bestValue = 0;
  for (const set of sets) {
    if (!isWorkingSet(set)) continue;
    const value = estimateOneRepMax(set.weightKg, set.reps) ?? 0;
    if (value > bestValue) {
      best = set;
      bestValue = value;
    }
  }
  return best;
}

export function completedSetCount(exercises: readonly WorkoutExercise[]): number {
  return exercises.reduce((sum, exercise) => sum + exercise.sets.filter((s) => s.done).length, 0);
}

/** Label shown in the SET column: the number for normal sets, a letter otherwise. */
export function setLabels(sets: readonly WorkoutSet[]): string[] {
  let n = 0;
  return sets.map((set) => {
    if (set.type === 'warmup') return 'W';
    if (set.type === 'drop') return 'D';
    if (set.type === 'failure') return 'F';
    n += 1;
    return String(n);
  });
}

/** Plates per side to load `targetKg` on a bar, greedy with standard plates. */
export function platesPerSide(
  targetKg: number,
  barKg = 20,
  available: readonly number[] = [25, 20, 15, 10, 5, 2.5, 1.25],
): { plates: number[]; remainderKg: number } {
  let perSide = Math.max(0, (targetKg - barKg) / 2);
  const plates: number[] = [];
  for (const plate of [...available].sort((a, b) => b - a)) {
    while (perSide + 1e-9 >= plate) {
      plates.push(plate);
      perSide -= plate;
    }
  }
  return { plates, remainderKg: Math.round(perSide * 2 * 100) / 100 };
}
