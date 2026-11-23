import { describe, expect, test } from 'vitest';
import {
  activityField,
  diaryEntryInput,
  food,
  loginInput,
  profile,
  setupInput,
  workoutInput,
} from './index';

const uuid = '0190d0a8-1c2b-7cde-8f00-123456789abc';

describe('auth', () => {
  test('normalises email addresses', () => {
    expect(loginInput.parse({ email: '  Me@Example.COM ', password: 'x' }).email).toBe(
      'me@example.com',
    );
  });

  test('requires 8+ character passwords on setup', () => {
    const result = setupInput.safeParse({ name: 'T', email: 'a@b.de', password: 'short' });
    expect(result.success).toBe(false);
  });

  test('fills in profile defaults', () => {
    expect(profile.parse({})).toEqual({
      units: 'metric',
      shoppingDay: 6,
      targets: { kcal: 2200, protein: 140, carbs: 250, fat: 70, waterMl: 2500 },
    });
  });
});

describe('nutrition', () => {
  test('food defaults', () => {
    const parsed = food.parse({
      id: uuid,
      name: 'Oats',
      per100g: { kcal: 370, protein: 13, carbs: 59, fat: 7 },
    });
    expect(parsed).toMatchObject({ brand: null, barcode: null, source: 'custom', servings: [] });
  });

  test('rejects malformed barcodes', () => {
    const result = food.safeParse({
      id: uuid,
      name: 'X',
      barcode: 'abc',
      per100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 },
    });
    expect(result.success).toBe(false);
  });

  test('a diary entry needs exactly one source', () => {
    const base = { id: uuid, date: '2026-11-23', meal: 'lunch' as const };
    expect(diaryEntryInput.safeParse({ ...base, quantity: { grams: 100 } }).success).toBe(false);
    expect(
      diaryEntryInput.safeParse({ ...base, foodId: uuid, recipeId: uuid, quantity: { grams: 1 } })
        .success,
    ).toBe(false);
    expect(
      diaryEntryInput.safeParse({ ...base, foodId: uuid, quantity: { grams: 1 } }).success,
    ).toBe(true);
    expect(
      diaryEntryInput.safeParse({
        ...base,
        quickAdd: { name: 'Coffee', nutrients: { kcal: 5, protein: 0, carbs: 0, fat: 0 } },
      }).success,
    ).toBe(true);
  });

  test('food and recipe entries need a quantity', () => {
    const result = diaryEntryInput.safeParse({
      id: uuid,
      date: '2026-11-23',
      meal: 'lunch',
      foodId: uuid,
    });
    expect(result.success).toBe(false);
  });
});

describe('activities', () => {
  test('field keys are identifiers', () => {
    expect(
      activityField.safeParse({ key: 'distance', label: 'Distance', type: 'distance' }).success,
    ).toBe(true);
    expect(activityField.safeParse({ key: 'Max Grade', label: 'x', type: 'text' }).success).toBe(
      false,
    );
  });

  test('workout sets default to an empty normal set', () => {
    const parsed = workoutInput.parse({
      id: uuid,
      name: 'Upper',
      startedAt: '2026-11-23T18:00:00+01:00',
      exercises: [{ exerciseId: uuid, sets: [{}] }],
    });
    expect(parsed.exercises[0]?.sets[0]).toEqual({
      type: 'normal',
      weightKg: null,
      reps: null,
      rpe: null,
      done: false,
    });
  });
});
