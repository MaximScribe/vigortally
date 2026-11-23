import { builtInExercises } from '@vigortally/core';
import type { WorkoutInput } from '@vigortally/schema';
import { screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { FakeServer } from '../test/fakeServer';
import { renderApp } from '../test/renderApp';
import { discardWorkout, getActiveWorkout } from './activeWorkout';

const bench = builtInExercises.find((e) => e.name === 'Bench Press' && e.equipment === 'dumbbell')!;

afterEach(() => {
  discardWorkout();
  vi.restoreAllMocks();
});

function workoutServer() {
  const saved: WorkoutInput[] = [];
  const server = new FakeServer()
    .on('GET', '/activity-types', () => [])
    .on('GET', '/exercises', () => builtInExercises)
    .on('GET', '/workouts/previous', () => ({
      [bench.id]: [
        { type: 'normal', weightKg: 17.5, reps: 12, rpe: null, done: true },
        { type: 'normal', weightKg: 17.5, reps: 10, rpe: null, done: true },
      ],
    }))
    .on('PUT', '/workouts/:id', ({ body }) => {
      saved.push(body as WorkoutInput);
      return { ...(body as object), volumeKg: 0 };
    });
  return { server, saved };
}

test('logs a workout: previous values, set types, rest timer and finish', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const { server, saved } = workoutServer();
  const { user, router } = renderApp('/activities', server);

  await user.click(await screen.findByRole('button', { name: 'Start an empty workout' }));
  expect(router.state.location.pathname).toBe('/workout');
  expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Add exercises' }));
  const picker = within(await screen.findByRole('dialog', { name: 'Add exercises' }));
  await user.type(picker.getByLabelText('Search exercises'), 'bench dumbbell');
  await user.click(await picker.findByRole('button', { name: /^Bench Press \(Dumbbell\)/ }));
  await user.click(picker.getByRole('button', { name: /^Add/ }));

  const block = within(await screen.findByRole('region', { name: 'Bench Press (Dumbbell)' }));
  expect(await block.findByText('17.5 kg × 12')).toBeVisible();

  // Set 1: check empty -> takes the previous numbers and starts the rest timer.
  await user.click(block.getByRole('button', { name: 'Complete set 1' }));
  expect(block.getByLabelText('Set 1 kg')).toHaveValue('17.5');
  expect(block.getByLabelText('Set 1 reps')).toHaveValue('12');
  expect(screen.getByRole('button', { name: /Rest timer, \d:\d\d left/ })).toBeVisible();

  // Set 2: typed values win.
  await user.type(block.getByLabelText('Set 2 kg'), '20');
  await user.type(block.getByLabelText('Set 2 reps'), '8');
  await user.click(block.getByRole('button', { name: 'Complete set 2' }));

  // Set 3 becomes a drop set but stays unchecked, so it is not saved.
  await user.click(block.getByRole('button', { name: /Set 3, Normal set/ }));
  await user.click(block.getByRole('button', { name: /Set W, Warm-up/ }));
  expect(block.getByRole('button', { name: /Set D, Drop set/ })).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Finish' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Activities' })).toBeVisible();

  expect(saved).toHaveLength(1);
  expect(saved[0]!.exercises).toEqual([
    {
      exerciseId: bench.id,
      supersetGroup: null,
      note: '',
      sets: [
        { type: 'normal', weightKg: 17.5, reps: 12, rpe: null, done: true },
        { type: 'normal', weightKg: 20, reps: 8, rpe: null, done: true },
      ],
    },
  ]);
  expect(saved[0]!.finishedAt).toBeTruthy();
  expect(getActiveWorkout()).toBeNull();
});

test('a minimised workout can be resumed', async () => {
  const { server } = workoutServer();
  const { user } = renderApp('/activities', server);

  await user.click(await screen.findByRole('button', { name: 'Start an empty workout' }));
  await user.click(screen.getByRole('button', { name: 'Minimise workout' }));
  await user.click(await screen.findByRole('button', { name: /Resume/ }));
  expect(screen.getByRole('button', { name: 'Finish' })).toBeVisible();
});
