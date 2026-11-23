import { randomUUID } from 'node:crypto';
import type { DiaryEntry, Recipe, RecipeInput, ShoppingList } from '@vigortally/schema';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { gramsFromText, isAllowedUrl, parseRecipeHtml } from '../lib/recipeImport';
import { createTestApp } from '../test/app';
import type { TestClient } from '../test/client';
import { setUpAdmin } from '../test/client';

const recipePage = `<!doctype html><html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
  {"@type":"WebPage","name":"Blog"},
  {"@type":["Recipe"],"name":"Chili sin Carne","recipeYield":["4","4 servings"],
   "recipeIngredient":["400 g kidney beans","1 kg tomatoes","2 onions &amp; garlic"],
   "recipeInstructions":[{"@type":"HowToStep","text":"Chop the onions."},{"@type":"HowToStep","text":"Simmer for 30 min."}],
   "recipeCategory":"Dinner","keywords":"vegan, batch cooking"}
]}</script></head><body></body></html>`;

let ctx: Awaited<ReturnType<typeof createTestApp>>;
let client: TestClient;
const pageFetch = vi.fn(async () => new Response(recipePage, { status: 200 }));

beforeEach(async () => {
  ctx = await createTestApp({ fetch: pageFetch as unknown as typeof fetch });
  client = await setUpAdmin(ctx.app);
  // Saturday is the shopping day; 2026-11-23 is a Monday.
  await client.patch('/api/me/profile', { shoppingDay: 6 });
});
afterEach(() => ctx.close());

async function food(name: string, kcal: number) {
  const id = randomUUID();
  await client.put(`/api/foods/${id}`, {
    id,
    name,
    per100g: { kcal, protein: 5, carbs: 10, fat: 1 },
  });
  return id;
}

async function recipe(input: Partial<RecipeInput> & Pick<RecipeInput, 'ingredients'>) {
  const id = randomUUID();
  const res = await client.put<Recipe>(`/api/recipes/${id}`, {
    id,
    name: 'Rice bowl',
    servings: 2,
    ...input,
  });
  expect(res.status).toBe(200);
  return res.body;
}

async function plan(date: string, recipeId: string, servings = 2) {
  const id = randomUUID();
  await client.put(`/api/meal-plan/${id}`, { id, date, meal: 'dinner', recipeId, servings });
}

describe('recipe import parsing', () => {
  test('reads schema.org JSON-LD including @graph and HowToSteps', () => {
    expect(parseRecipeHtml(recipePage)).toEqual({
      name: 'Chili sin Carne',
      servings: 4,
      ingredients: [
        { text: '400 g kidney beans', grams: 400 },
        { text: '1 kg tomatoes', grams: 1000 },
        { text: '2 onions & garlic', grams: null },
      ],
      instructions: '1. Chop the onions.\n2. Simmer for 30 min.',
      tags: ['Dinner', 'vegan', 'batch cooking'],
    });
    expect(parseRecipeHtml('<html>no data</html>')).toBeNull();
  });

  test('grams from simple metric amounts', () => {
    expect(gramsFromText('250ml milk')).toBe(250);
    expect(gramsFromText('1,5 kg potatoes')).toBe(1500);
    expect(gramsFromText('2 eggs')).toBeNull();
  });

  test('refuses internal addresses', () => {
    expect(isAllowedUrl(new URL('https://www.example.com/r'))).toBe(true);
    for (const url of [
      'http://localhost:8080',
      'http://192.168.1.5',
      'http://10.0.0.1',
      'file:///etc/passwd',
    ]) {
      expect(isAllowedUrl(new URL(url)), url).toBe(false);
    }
  });
});

describe('recipes', () => {
  test('computes nutrition per serving and flags unlinked ingredients', async () => {
    const rice = await food('Rice', 350);
    const r = await recipe({
      ingredients: [
        { foodId: rice, text: '200 g rice', grams: 200 },
        { text: 'salt', foodId: null, grams: null },
      ],
    });
    expect(r.nutritionPerServing.kcal).toBe(350);
    expect(r.nutritionComplete).toBe(false);
  });

  test('imports a draft from a URL without saving it', async () => {
    const res = await client.post<RecipeInput>('/api/recipes/import', {
      url: 'https://recipes.example.com/chili',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Chili sin Carne',
      servings: 4,
      sourceUrl: 'https://recipes.example.com/chili',
    });
    expect((await client.get<Recipe[]>('/api/recipes')).body).toEqual([]);
    expect((await client.post('/api/recipes/import', { url: 'http://192.168.0.2/x' })).status).toBe(
      400,
    );
  });

  test('can be logged in the diary by serving', async () => {
    const rice = await food('Rice', 350);
    const r = await recipe({ ingredients: [{ foodId: rice, text: 'rice', grams: 200 }] });
    const id = randomUUID();
    const res = await client.put<DiaryEntry>(`/api/diary/${id}`, {
      id,
      date: '2026-11-23',
      meal: 'dinner',
      recipeId: r.id,
      quantity: { servings: 1.5 },
    });
    expect(res.body).toMatchObject({ name: 'Rice bowl', servings: 1.5, nutrients: { kcal: 525 } });
  });
});

describe('shopping list', () => {
  test('lists what planned meals need until the shopping day, minus assumed stock', async () => {
    const rice = await food('Rice', 350);
    const beans = await food('Beans', 120);
    const bowl = await recipe({
      ingredients: [
        { foodId: rice, text: 'rice', grams: 200 },
        { foodId: beans, text: 'beans', grams: 300 },
      ],
    });
    await plan('2026-11-23', bowl.id); // Monday
    await plan('2026-11-25', bowl.id, 4); // Wednesday, double portion
    await plan('2026-12-01', bowl.id); // after Saturday: ignored

    // Bought 500 g rice earlier.
    const p = randomUUID();
    await client.put(`/api/purchases/${p}`, { id: p, foodId: rice, grams: 500 });

    const list = await client.get<ShoppingList>('/api/shopping-list?today=2026-11-23');
    expect(list.body).toMatchObject({ from: '2026-11-23', until: '2026-11-28' });
    expect(list.body.items).toEqual([
      { foodId: beans, name: 'Beans', gramsToBuy: 900, gramsNeeded: 900, gramsInStock: 0 },
      { foodId: rice, name: 'Rice', gramsToBuy: 100, gramsNeeded: 600, gramsInStock: 500 },
    ]);
    expect(list.body.daysUntilShopping).toBe(0); // no beans at all
  });

  test('eating updates stock, and a logged planned meal no longer counts as needed', async () => {
    const rice = await food('Rice', 350);
    const bowl = await recipe({ ingredients: [{ foodId: rice, text: 'rice', grams: 200 }] });
    await plan('2026-11-23', bowl.id);
    await plan('2026-11-24', bowl.id);
    const p = randomUUID();
    await client.put(`/api/purchases/${p}`, { id: p, foodId: rice, grams: 400 });

    let list = await client.get<ShoppingList>('/api/shopping-list?today=2026-11-23');
    expect(list.body.items).toEqual([]);
    expect(list.body).toMatchObject({ coveredUntil: '2026-11-24', daysUntilShopping: 2 });

    // Cook and eat Monday's dinner (2 servings).
    const d = randomUUID();
    await client.put(`/api/diary/${d}`, {
      id: d,
      date: '2026-11-23',
      meal: 'dinner',
      recipeId: bowl.id,
      quantity: { servings: 2 },
    });
    list = await client.get<ShoppingList>('/api/shopping-list?today=2026-11-23');
    expect(list.body.items).toEqual([]);
    expect(list.body.coveredUntil).toBe('2026-11-24');

    // An off-plan rice snack eats into Tuesday's rice.
    const s = randomUUID();
    await client.put(`/api/diary/${s}`, {
      id: s,
      date: '2026-11-23',
      meal: 'snack',
      foodId: rice,
      quantity: { grams: 100 },
    });
    list = await client.get<ShoppingList>('/api/shopping-list?today=2026-11-23');
    expect(list.body.items).toEqual([
      expect.objectContaining({ name: 'Rice', gramsToBuy: 100, gramsInStock: 100 }),
    ]);
  });

  test('hand-written extras', async () => {
    const id = randomUUID();
    await client.put(`/api/shopping-extras/${id}`, { id, text: 'Dish soap' });
    await client.put(`/api/shopping-extras/${id}`, { id, text: 'Dish soap', done: true });
    expect((await client.get<ShoppingList>('/api/shopping-list')).body.extras).toEqual([
      { id, text: 'Dish soap', done: true },
    ]);
    await client.delete('/api/shopping-extras');
    expect((await client.get<ShoppingList>('/api/shopping-list')).body.extras).toEqual([]);
  });
});
