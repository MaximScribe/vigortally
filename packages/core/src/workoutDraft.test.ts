import { expect, test } from 'vitest';
import {
  completedWorkout,
  completeSet,
  emptySet,
  exercisesFromTemplate,
  nextSetType,
  type WorkoutDraft,
} from './workoutDraft';

test('set types cycle', () => {
  expect(nextSetType('normal')).toBe('warmup');
  expect(nextSetType('failure')).toBe('normal');
});

test('completing an empty set copies the previous numbers, typed numbers win', () => {
  const prev = { ...emptySet(), weightKg: 20, reps: 10, done: true };
  expect(completeSet(emptySet(), prev)).toMatchObject({ done: true, weightKg: 20, reps: 10 });
  expect(completeSet({ ...emptySet(), reps: 8 }, prev)).toMatchObject({ weightKg: 20, reps: 8 });
  expect(completeSet(emptySet(), undefined)).toMatchObject({ weightKg: null, reps: null });
});

test('templates start unchecked and keep set types', () => {
  const [e] = exercisesFromTemplate([
    {
      exerciseId: 'x',
      supersetGroup: null,
      note: '',
      sets: [{ ...emptySet('warmup'), weightKg: 10, done: true }],
    },
  ]);
  expect(e?.sets[0]).toMatchObject({ type: 'warmup', weightKg: 10, done: false });
});

test('only completed sets and exercises are saved', () => {
  const draft: WorkoutDraft = {
    id: 'w',
    name: '  ',
    templateId: null,
    startedAt: '2026-11-25T17:00:00.000Z',
    notes: ' good ',
    restEndsAt: null,
    restSeconds: 90,
    exercises: [
      {
        exerciseId: 'a',
        supersetGroup: null,
        note: '',
        sets: [{ ...emptySet(), done: true }, emptySet()],
      },
      { exerciseId: 'b', supersetGroup: null, note: '', sets: [emptySet()] },
    ],
  };
  const saved = completedWorkout(draft, new Date('2026-11-25T18:00:00.000Z'));
  expect(saved).toMatchObject({ name: 'Workout', notes: 'good' });
  expect(saved.exercises.map((e) => [e.exerciseId, e.sets.length])).toEqual([['a', 1]]);
});
