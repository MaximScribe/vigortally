import { activityField, exercise } from '@vigortally/schema';
import { expect, test } from 'vitest';
import { builtInExercises, exerciseDisplayName } from './exercises';
import { activityPresets, findPreset } from './presets';

test('presets have unique keys and valid fields', () => {
  const keys = activityPresets.map((p) => p.key);
  expect(new Set(keys).size).toBe(keys.length);
  for (const preset of activityPresets) {
    for (const field of preset.fields) expect(activityField.parse(field)).toEqual(field);
    const fieldKeys = preset.fields.map((f) => f.key);
    expect(new Set(fieldKeys).size, preset.key).toBe(fieldKeys.length);
  }
  expect(findPreset('strength')?.kind).toBe('strength');
});

test('built-in exercises are valid with unique ids and names', () => {
  const ids = builtInExercises.map((e) => e.id);
  expect(new Set(ids).size).toBe(ids.length);
  const names = builtInExercises.map(exerciseDisplayName);
  expect(new Set(names).size).toBe(names.length);
  for (const e of builtInExercises) expect(exercise.parse(e)).toEqual(e);
});

test('display names include the equipment', () => {
  expect(exerciseDisplayName({ name: 'Bench Press', equipment: 'dumbbell' })).toBe(
    'Bench Press (Dumbbell)',
  );
  expect(exerciseDisplayName({ name: 'Pull Up', equipment: 'bodyweight' })).toBe('Pull Up');
});
