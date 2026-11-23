import type { WorkoutSet } from '@vigortally/schema';
import { describe, expect, test } from 'vitest';
import {
  addDays,
  bestSet,
  daysBetween,
  eachDay,
  estimateOneRepMax,
  formatDuration,
  macroEnergySplit,
  nextWeekday,
  nutrientsForGrams,
  parseDuration,
  platesPerSide,
  recipeNutrition,
  setLabels,
  startOfWeek,
  sumNutrients,
  today,
  volume,
  weekday,
} from './index';

const set = (overrides: Partial<WorkoutSet>): WorkoutSet => ({
  type: 'normal',
  weightKg: null,
  reps: null,
  rpe: null,
  done: true,
  ...overrides,
});

describe('dates', () => {
  test('adds days across month and DST boundaries', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  test('weekdays and week starts', () => {
    expect(weekday('2026-11-23')).toBe(1); // Monday
    expect(startOfWeek('2026-11-29')).toBe('2026-11-23');
    expect(nextWeekday('2026-11-23', 6)).toBe('2026-11-28');
    expect(nextWeekday('2026-11-28', 6)).toBe('2026-11-28');
  });

  test('ranges', () => {
    expect(eachDay('2026-11-29', '2026-12-01')).toEqual(['2026-11-29', '2026-11-30', '2026-12-01']);
    expect(daysBetween('2026-11-23', '2026-11-30')).toBe(7);
  });

  test('today uses local time', () => {
    expect(today(new Date(2026, 10, 23, 23, 30))).toBe('2026-11-23');
  });
});

describe('nutrition', () => {
  const oats = { kcal: 370, protein: 13, carbs: 59, fat: 7, fiber: 10 };

  test('scales per-100g values', () => {
    expect(nutrientsForGrams(oats, 50)).toEqual({
      kcal: 185,
      protein: 6.5,
      carbs: 29.5,
      fat: 3.5,
      fiber: 5,
    });
  });

  test('sums, keeping optional nutrients only when present', () => {
    const total = sumNutrients([oats, { kcal: 100, protein: 1, carbs: 2, fat: 3 }]);
    expect(total).toEqual({ kcal: 470, protein: 14, carbs: 61, fat: 10, fiber: 10 });
    expect(sumNutrients([{ kcal: 1, protein: 1, carbs: 1, fat: 1 }])).not.toHaveProperty('fiber');
  });

  test('recipe nutrition per serving and completeness', () => {
    const result = recipeNutrition(
      [
        { per100g: oats, grams: 200 },
        { per100g: { kcal: 64, protein: 3.4, carbs: 4.8, fat: 3.6 }, grams: 500 },
        { per100g: null, grams: null },
      ],
      2,
    );
    expect(result.complete).toBe(false);
    expect(result.total.kcal).toBe(1060);
    expect(result.perServing).toMatchObject({ kcal: 530, protein: 21.5 });
  });

  test('macro energy split', () => {
    const split = macroEnergySplit({ protein: 25, carbs: 50, fat: 0 });
    expect(split.protein).toBeCloseTo(1 / 3);
    expect(split.carbs).toBeCloseTo(2 / 3);
    expect(macroEnergySplit({ protein: 0, carbs: 0, fat: 0 })).toEqual({
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });
});

describe('strength', () => {
  test('one-rep max estimate', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.33, 1);
    expect(estimateOneRepMax(null, 5)).toBeNull();
  });

  test('volume ignores warm-ups and unfinished sets', () => {
    const sets = [
      set({ type: 'warmup', weightKg: 40, reps: 10 }),
      set({ weightKg: 60, reps: 10 }),
      set({ weightKg: 60, reps: 8, done: false }),
      set({ type: 'drop', weightKg: 40, reps: 12 }),
    ];
    expect(volume(sets)).toBe(600 + 480);
    expect(bestSet(sets)).toMatchObject({ weightKg: 60, reps: 10 });
  });

  test('set labels number normal sets and letter the rest', () => {
    const sets = [
      set({ type: 'warmup' }),
      set({}),
      set({}),
      set({ type: 'drop' }),
      set({ type: 'failure' }),
    ];
    expect(setLabels(sets)).toEqual(['W', '1', '2', 'D', 'F']);
  });

  test('plate calculator', () => {
    expect(platesPerSide(100)).toEqual({ plates: [25, 15], remainderKg: 0 });
    expect(platesPerSide(61)).toEqual({ plates: [20], remainderKg: 1 });
    expect(platesPerSide(15)).toEqual({ plates: [], remainderKg: 0 });
  });
});

describe('units', () => {
  test('durations', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(parseDuration('1:02:05')).toBe(3725);
    expect(parseDuration('45')).toBe(2700);
    expect(parseDuration('1:75')).toBeNull();
    expect(parseDuration('abc')).toBeNull();
  });
});
