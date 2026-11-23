import { randomUUID } from 'node:crypto';
import type { DayNutrition, DiaryEntry, Food, WeighIn } from '@vigortally/schema';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { parseProduct } from '../lib/openFoodFacts';
import { createTestApp } from '../test/app';
import { setUpAdmin, TestClient } from '../test/client';

const offProduct = {
  status: 1,
  product: {
    product_name: 'Rolled Oats',
    brands: 'Kölln, Other',
    serving_quantity: 40,
    serving_size: '40 g',
    nutriments: {
      'energy-kcal_100g': 372,
      proteins_100g: 13.5,
      carbohydrates_100g: 58.7,
      fat_100g: 7,
      fiber_100g: 10,
      sugars_100g: 0.7,
    },
  },
};

const offFetch = vi.fn(async (url: string | URL | Request) =>
  String(url).includes('4000000000001')
    ? new Response(JSON.stringify(offProduct))
    : new Response(JSON.stringify({ status: 0 }), { status: 404 }),
);

let ctx: Awaited<ReturnType<typeof createTestApp>>;
let client: TestClient;
beforeEach(async () => {
  offFetch.mockClear();
  ctx = await createTestApp({ fetch: offFetch as unknown as typeof fetch });
  client = await setUpAdmin(ctx.app);
});
afterEach(() => ctx.close());

const oats = (overrides: Partial<Food> = {}) => ({
  id: randomUUID(),
  name: 'Oats',
  per100g: { kcal: 370, protein: 13, carbs: 59, fat: 7 },
  servings: [{ label: '1 cup', grams: 80 }],
  ...overrides,
});

describe('Open Food Facts parsing', () => {
  test('maps nutrients, serving and first brand', () => {
    expect(parseProduct(offProduct.product)).toEqual({
      name: 'Rolled Oats',
      brand: 'Kölln',
      per100g: { kcal: 372, protein: 13.5, carbs: 58.7, fat: 7, fiber: 10, sugar: 0.7 },
      servings: [{ label: '40 g', grams: 40 }],
    });
  });

  test('falls back to kJ and rejects products without macros', () => {
    expect(
      parseProduct({
        product_name: 'X',
        nutriments: { energy_100g: 418.4, proteins_100g: 1, carbohydrates_100g: 2, fat_100g: 3 },
      })?.per100g.kcal,
    ).toBe(100);
    expect(parseProduct({ product_name: 'X', nutriments: {} })).toBeNull();
  });
});

describe('foods', () => {
  test('creates, searches and updates household foods', async () => {
    const food = oats({ brand: 'Kölln' });
    expect((await client.put(`/api/foods/${food.id}`, food)).status).toBe(200);
    const rice = oats({ name: 'Rice' });
    await client.put(`/api/foods/${rice.id}`, rice);

    const found = await client.get<Food[]>('/api/foods?q=köl');
    expect(found.body.map((f) => f.name)).toEqual(['Oats']);

    await client.put(`/api/foods/${food.id}`, { ...food, name: 'Porridge oats' });
    expect((await client.get<Food[]>('/api/foods')).body.map((f) => f.name)).toEqual([
      'Porridge oats',
      'Rice',
    ]);
  });

  test('looks up barcodes on Open Food Facts once and caches them', async () => {
    const first = await client.get<Food>('/api/foods/barcode/4000000000001');
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ name: 'Rolled Oats', source: 'openfoodfacts' });

    const second = await client.get<Food>('/api/foods/barcode/4000000000001');
    expect(second.body.id).toBe(first.body.id);
    expect(offFetch).toHaveBeenCalledTimes(1);
    expect(String(offFetch.mock.calls[0]![0])).toMatch(
      /^https:\/\/world\.openfoodfacts\.org\/api\/v2\/product\/4000000000001\.json/,
    );
  });

  test('unknown and invalid barcodes', async () => {
    expect((await client.get('/api/foods/barcode/4000000000099')).status).toBe(404);
    expect((await client.get('/api/foods/barcode/abc')).status).toBe(400);
  });
});

describe('diary', () => {
  test('logs foods by grams or servings with a nutrient snapshot', async () => {
    const food = oats();
    await client.put(`/api/foods/${food.id}`, food);

    const byGrams = { id: randomUUID(), date: '2026-11-23', meal: 'breakfast', foodId: food.id };
    const a = await client.put<DiaryEntry>(`/api/diary/${byGrams.id}`, {
      ...byGrams,
      quantity: { grams: 50 },
    });
    expect(a.body).toMatchObject({
      name: 'Oats',
      grams: 50,
      nutrients: { kcal: 185, protein: 6.5 },
    });

    const bySrv = { ...byGrams, id: randomUUID() };
    const b = await client.put<DiaryEntry>(`/api/diary/${bySrv.id}`, {
      ...bySrv,
      quantity: { servings: 2 },
    });
    expect(b.body).toMatchObject({ grams: 160, servings: 2, nutrients: { kcal: 592 } });

    // Changing the food later does not rewrite what was logged.
    await client.put(`/api/foods/${food.id}`, { ...food, per100g: { ...food.per100g, kcal: 1 } });

    const day = await client.get<DayNutrition>('/api/diary?date=2026-11-23');
    expect(day.body.entries).toHaveLength(2);
    expect(day.body.totals.kcal).toBe(777);
  });

  test('quick add and delete', async () => {
    const id = randomUUID();
    await client.put(`/api/diary/${id}`, {
      id,
      date: '2026-11-23',
      meal: 'snack',
      quickAdd: { name: 'Coffee', nutrients: { kcal: 5, protein: 0.3, carbs: 0, fat: 0 } },
    });
    expect((await client.get<DayNutrition>('/api/diary?date=2026-11-23')).body.totals.kcal).toBe(5);
    await client.delete(`/api/diary/${id}`);
    expect((await client.get<DayNutrition>('/api/diary?date=2026-11-23')).body.entries).toEqual([]);
  });

  test('rejects recipe entries until recipes exist and unknown foods', async () => {
    const id = randomUUID();
    const base = { id, date: '2026-11-23', meal: 'lunch' };
    expect(
      (
        await client.put(`/api/diary/${id}`, {
          ...base,
          recipeId: randomUUID(),
          quantity: { servings: 1 },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await client.put(`/api/diary/${id}`, {
          ...base,
          foodId: randomUUID(),
          quantity: { grams: 1 },
        })
      ).status,
    ).toBe(400);
  });

  test('entries are private to each user', async () => {
    const id = randomUUID();
    await client.put(`/api/diary/${id}`, {
      id,
      date: '2026-11-23',
      meal: 'snack',
      quickAdd: { name: 'Mine', nutrients: { kcal: 100, protein: 0, carbs: 0, fat: 0 } },
    });
    await client.post('/api/users', { name: 'P', email: 'p@example.com', password: 'p password' });
    const other = new TestClient(ctx.app);
    await other.post('/api/auth/login', { email: 'p@example.com', password: 'p password' });
    expect((await other.get<DayNutrition>('/api/diary?date=2026-11-23')).body.entries).toEqual([]);
  });
});

describe('water and weigh-ins', () => {
  test('water adds up per day and can be corrected with negative entries', async () => {
    const first = randomUUID();
    await client.put(`/api/water/${first}`, { id: first, date: '2026-11-23', ml: 250 });
    const glass = randomUUID();
    await client.put(`/api/water/${glass}`, { id: glass, date: '2026-11-23', ml: 500 });
    // Retrying the same entry doesn't double count.
    const res = await client.put<DayNutrition>(`/api/water/${glass}`, {
      id: glass,
      date: '2026-11-23',
      ml: 500,
    });
    expect(res.body.waterMl).toBe(750);
    const undo = randomUUID();
    const after = await client.put<DayNutrition>(`/api/water/${undo}`, {
      id: undo,
      date: '2026-11-23',
      ml: -250,
    });
    expect(after.body.waterMl).toBe(500);
  });

  test('one weigh-in per day; a second one replaces the first', async () => {
    const w1 = randomUUID();
    await client.put(`/api/weigh-ins/${w1}`, { id: w1, date: '2026-11-22', weightKg: 81.2 });
    const w2 = randomUUID();
    await client.put(`/api/weigh-ins/${w2}`, { id: w2, date: '2026-11-23', weightKg: 80.9 });
    const again = randomUUID();
    await client.put(`/api/weigh-ins/${again}`, { id: again, date: '2026-11-23', weightKg: 80.7 });

    const list = await client.get<WeighIn[]>('/api/weigh-ins?from=2026-11-01');
    expect(list.body.map((w) => w.weightKg)).toEqual([81.2, 80.7]);
    const day = await client.get<DayNutrition>('/api/diary?date=2026-11-23');
    expect(day.body.weighIn?.weightKg).toBe(80.7);
  });
});
