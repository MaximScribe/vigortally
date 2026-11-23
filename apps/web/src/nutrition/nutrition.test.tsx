import { today } from '@vigortally/core';
import type { DayNutrition, DiaryEntryInput, Food } from '@vigortally/schema';
import { screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { FakeServer } from '../test/fakeServer';
import { renderApp } from '../test/renderApp';

const oats: Food = {
  id: '00000000-0000-4000-8000-00000000f00d',
  name: 'Oats',
  brand: null,
  barcode: '4000000000001',
  source: 'openfoodfacts',
  per100g: { kcal: 370, protein: 13, carbs: 59, fat: 7 },
  servings: [{ label: '1 cup', grams: 80 }],
};

function nutritionServer() {
  const day: DayNutrition = {
    date: today(),
    entries: [],
    totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    waterMl: 0,
    weighIn: null,
  };
  const logged: DiaryEntryInput[] = [];
  const server = new FakeServer()
    .on('GET', '/diary', () => day)
    .on('GET', '/foods/recent', () => [oats])
    .on('GET', '/foods', () => [oats])
    .on('GET', '/foods/barcode/:code', () => oats)
    .on('PUT', '/diary/:id', ({ body }) => {
      const input = body as DiaryEntryInput;
      logged.push(input);
      const grams =
        input.quantity && 'servings' in input.quantity ? input.quantity.servings * 80 : 100;
      const entry = {
        id: input.id,
        date: input.date,
        meal: input.meal,
        foodId: input.foodId ?? null,
        recipeId: null,
        name: input.quickAdd?.name ?? 'Oats',
        grams,
        servings: null,
        nutrients: input.quickAdd?.nutrients ?? { kcal: 296, protein: 10.4, carbs: 47.2, fat: 5.6 },
        createdAt: new Date().toISOString(),
      };
      day.entries.push(entry);
      day.totals = {
        kcal: day.totals.kcal + entry.nutrients.kcal,
        protein: day.totals.protein + entry.nutrients.protein,
        carbs: day.totals.carbs + entry.nutrients.carbs,
        fat: day.totals.fat + entry.nutrients.fat,
      };
      return entry;
    })
    .on('PUT', '/water/:id', ({ body }) => {
      day.waterMl += (body as { ml: number }).ml;
      return { ...day };
    });
  return { server, logged, day };
}

test('logs a recent food by serving and updates the ring', async () => {
  const { server, logged } = nutritionServer();
  const { user } = renderApp('/nutrition', server);

  expect(await screen.findByText('of 2,200 kcal')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Add to breakfast' }));
  const sheet = within(await screen.findByRole('dialog', { name: 'Add to breakfast' }));
  await user.click(await sheet.findByRole('button', { name: /Oats/ }));
  expect(sheet.getByLabelText('Nutrition for this amount')).toHaveTextContent('296');
  await user.click(sheet.getByRole('button', { name: 'Add' }));

  expect(await screen.findByText('Oats')).toBeVisible();
  expect(logged[0]).toMatchObject({
    meal: 'breakfast',
    foodId: oats.id,
    quantity: { servings: 1 },
  });
  expect(screen.getByRole('progressbar', { name: 'Protein' })).toHaveAttribute(
    'aria-valuenow',
    '10',
  );
  expect(screen.getByText('1,904 left')).toBeVisible();
});

test('quick add and water', async () => {
  const { server, logged } = nutritionServer();
  const { user } = renderApp('/nutrition', server);

  await user.click(await screen.findByRole('button', { name: 'Add to snacks' }));
  const sheet = within(await screen.findByRole('dialog'));
  await user.click(sheet.getByRole('tab', { name: 'Quick add' }));
  await user.type(sheet.getByLabelText('Name'), 'Coffee');
  await user.type(sheet.getByLabelText('Calories'), '5');
  await user.click(sheet.getByRole('button', { name: 'Add' }));
  expect(await screen.findByText('Coffee')).toBeVisible();
  expect(logged[0]?.quickAdd).toEqual({
    name: 'Coffee',
    nutrients: { kcal: 5, protein: 0, carbs: 0, fat: 0 },
  });

  await user.click(screen.getByRole('button', { name: '+500' }));
  expect(await screen.findByText(/^0\.5/)).toBeVisible();
});
