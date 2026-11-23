import { addDays, today } from '@vigortally/core';
import type { Food, PurchaseInput, RecipeInput, ShoppingList } from '@vigortally/schema';
import { screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { FakeServer } from '../test/fakeServer';
import { renderApp } from '../test/renderApp';

const rice: Food = {
  id: '00000000-0000-4000-8000-0000000000b1',
  name: 'Rice',
  brand: null,
  barcode: null,
  source: 'custom',
  per100g: { kcal: 350, protein: 7, carbs: 77, fat: 1 },
  servings: [],
};

function kitchenServer() {
  const purchases: PurchaseInput[] = [];
  const saved: RecipeInput[] = [];
  const list: ShoppingList = {
    from: today(),
    until: addDays(today(), 5),
    items: [
      { foodId: rice.id, name: 'Rice', gramsToBuy: 250, gramsNeeded: 450, gramsInStock: 200 },
    ],
    extras: [],
    coveredUntil: addDays(today(), 1),
    daysUntilShopping: 2,
  };
  const server = new FakeServer()
    .on('GET', '/diary', () => ({
      date: today(),
      entries: [],
      totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      waterMl: 0,
      weighIn: null,
    }))
    .on('GET', '/meal-plan', () => [
      {
        id: '00000000-0000-4000-8000-000000000c01',
        date: today(),
        meal: 'dinner',
        recipeId: '00000000-0000-4000-8000-000000000d01',
        servings: 2,
        recipeName: 'Rice bowl',
      },
    ])
    .on('GET', '/shopping-list', () => list)
    .on('PUT', '/purchases/:id', ({ body }) => {
      purchases.push(body as PurchaseInput);
      list.items = [];
      list.daysUntilShopping = 5;
      return body;
    })
    .on('GET', '/recipes', () => [])
    .on('GET', '/foods', () => [rice])
    .on('GET', '/foods/recent', () => [rice])
    .on('PUT', '/recipes/:id', ({ body }) => {
      saved.push(body as RecipeInput);
      return body;
    });
  return { server, purchases, saved };
}

test('the kitchen panel shows today and the shopping forecast; ticking records a purchase', async () => {
  const { server, purchases } = kitchenServer();
  const { user } = renderApp('/nutrition', server);

  const toggle = await screen.findByRole('button', { name: /Kitchen/ });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(await within(toggle).findByText('Today: Rice bowl · shop in 2 days')).toBeVisible();

  await user.click(toggle);
  await user.click(screen.getByRole('tab', { name: 'Shopping' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Shop in 2 days');
  const list = within(screen.getByRole('list', { name: 'Shopping list' }));
  expect(list.getByText('Rice')).toBeVisible();
  expect(list.getByText('250 g')).toBeVisible();

  await user.click(list.getByRole('button', { name: 'Bought Rice' }));
  expect(await screen.findByText('Nothing to buy for the planned meals.')).toBeVisible();
  expect(purchases[0]).toMatchObject({ foodId: rice.id, grams: 250 });
});

test('creates a recipe with a linked ingredient and a live nutrition preview', async () => {
  const { server, saved } = kitchenServer();
  const { user } = renderApp('/kitchen/recipes/new', server);

  await user.type(await screen.findByLabelText('Name'), 'Rice bowl');
  await user.clear(screen.getByLabelText('Servings'));
  await user.type(screen.getByLabelText('Servings'), '2');
  await user.click(screen.getByRole('button', { name: /Add ingredient/ }));
  await user.type(screen.getByLabelText('Amount'), '200');
  await user.click(screen.getByRole('button', { name: 'Link ingredient 1 to a food' }));
  const sheet = within(await screen.findByRole('dialog', { name: 'Link to a food' }));
  await user.click(await sheet.findByRole('button', { name: /Rice/ }));

  expect(screen.getByLabelText('Ingredient 1')).toHaveValue('Rice');
  expect(screen.getByLabelText('Nutrition per serving')).toHaveTextContent('350');
  await user.click(screen.getByRole('button', { name: 'Save recipe' }));

  expect(await screen.findByRole('heading', { level: 1, name: 'Nutrition' })).toBeVisible();
  expect(saved[0]).toMatchObject({
    name: 'Rice bowl',
    servings: 2,
    ingredients: [{ foodId: rice.id, text: 'Rice', grams: 200 }],
  });
});
