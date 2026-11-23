import { describe, expect, test } from 'vitest';
import { computeShoppingList, estimateStock, type PlannedMeal } from './shopping';

const RICE = 'rice';
const CHICKEN = 'chicken';
const BEANS = 'beans';

const meal = (date: string, ingredients: [string, number][]): PlannedMeal => ({
  date,
  ingredients: ingredients.map(([foodId, grams]) => ({ foodId, grams })),
});

describe('estimateStock', () => {
  test('is bought minus eaten, never negative', () => {
    const stock = estimateStock(
      new Map([
        [RICE, 1000],
        [CHICKEN, 500],
      ]),
      new Map([
        [RICE, 300],
        [CHICKEN, 800],
      ]),
    );
    expect(stock.get(RICE)).toBe(700);
    expect(stock.get(CHICKEN)).toBe(0);
  });
});

describe('computeShoppingList', () => {
  const plan = [
    meal('2026-11-23', [
      [RICE, 150],
      [CHICKEN, 200],
    ]),
    meal('2026-11-24', [
      [RICE, 150],
      [BEANS, 250],
    ]),
    meal('2026-11-25', [
      [RICE, 150],
      [CHICKEN, 200],
    ]),
    meal('2026-12-01', [[RICE, 1000]]), // after the shopping day: ignored
  ];

  test('lists what the planned meals need beyond the assumed stock', () => {
    const result = computeShoppingList({
      today: '2026-11-23',
      until: '2026-11-28',
      plannedMeals: plan,
      purchasedGrams: new Map([
        [RICE, 1000],
        [CHICKEN, 300],
      ]),
      consumedGrams: new Map([[RICE, 800]]),
    });

    expect(result.items).toEqual([
      { foodId: BEANS, gramsNeeded: 250, gramsInStock: 0, gramsToBuy: 250 },
      { foodId: RICE, gramsNeeded: 450, gramsInStock: 200, gramsToBuy: 250 },
      { foodId: CHICKEN, gramsNeeded: 400, gramsInStock: 300, gramsToBuy: 100 },
    ]);
    // Day 1 is covered (rice 150 of 200, chicken 200 of 300); day 2 has no beans.
    expect(result.coveredUntil).toBe('2026-11-23');
    expect(result.daysUntilShopping).toBe(1);
  });

  test('ignores meals before today', () => {
    const result = computeShoppingList({
      today: '2026-11-25',
      until: '2026-11-28',
      plannedMeals: plan,
      purchasedGrams: new Map(),
      consumedGrams: new Map(),
    });
    expect(result.items.map((i) => i.foodId)).toEqual([CHICKEN, RICE]);
    expect(result.daysUntilShopping).toBe(0);
    expect(result.coveredUntil).toBeNull();
  });

  test('everything covered', () => {
    const result = computeShoppingList({
      today: '2026-11-23',
      until: '2026-11-28',
      plannedMeals: plan,
      purchasedGrams: new Map([
        [RICE, 5000],
        [CHICKEN, 5000],
        [BEANS, 5000],
      ]),
      consumedGrams: new Map(),
    });
    expect(result.items).toEqual([]);
    expect(result.coveredUntil).toBe('2026-11-25');
    expect(result.daysUntilShopping).toBe(3);
  });

  test('nothing planned', () => {
    const result = computeShoppingList({
      today: '2026-11-23',
      until: '2026-11-28',
      plannedMeals: [],
      purchasedGrams: new Map(),
      consumedGrams: new Map(),
    });
    expect(result).toEqual({ items: [], coveredUntil: null, daysUntilShopping: null });
  });
});
