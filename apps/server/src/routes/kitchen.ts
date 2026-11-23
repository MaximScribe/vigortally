import { randomUUID } from 'node:crypto';
import {
  addDays,
  computeShoppingList,
  nextWeekday,
  recipeNutrition,
  stockFromEvents,
  today as todayIso,
  type StockEvent,
} from '@vigortally/core';
import {
  id as idSchema,
  importRecipeInput,
  isoDate,
  mealPlanEntryInput,
  purchaseInput,
  recipeInput,
  shoppingExtraInput,
  type MealPlanEntry,
  type Recipe,
  type ShoppingList,
} from '@vigortally/schema';
import { and, eq, gte, inArray, isNotNull, lte } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context';
import type { Database } from '../db/client';
import {
  diaryEntries,
  foods,
  mealPlanEntries,
  purchases,
  recipes,
  shoppingExtras,
  users,
} from '../db/schema';
import { fail, notFound } from '../http/errors';
import { readBody, readQuery } from '../http/validate';
import { fetchRecipe, isAllowedUrl } from '../lib/recipeImport';
import type { RecipeResolver } from './nutrition';

type RecipeRow = typeof recipes.$inferSelect;

function pathId(c: Context): string {
  const result = idSchema.safeParse(c.req.param('id'));
  if (!result.success) notFound();
  return result.data;
}

/** Adds nutrition per serving, using the household's foods. */
async function withNutrition(db: Database, rows: RecipeRow[]): Promise<Recipe[]> {
  const foodIds = [
    ...new Set(rows.flatMap((r) => r.ingredients.map((i) => i.foodId).filter(Boolean))),
  ] as string[];
  const foodRows = foodIds.length
    ? await db
        .select({ id: foods.id, per100g: foods.per100g })
        .from(foods)
        .where(inArray(foods.id, foodIds))
    : [];
  const per100g = new Map(foodRows.map((f) => [f.id, f.per100g]));
  return rows.map((row) => {
    const nutrition = recipeNutrition(
      row.ingredients.map((i) => ({
        per100g: i.foodId ? (per100g.get(i.foodId) ?? null) : null,
        grams: i.grams,
      })),
      row.servings,
    );
    return {
      id: row.id,
      name: row.name,
      servings: row.servings,
      ingredients: row.ingredients,
      instructions: row.instructions,
      tags: row.tags,
      sourceUrl: row.sourceUrl,
      nutritionPerServing: nutrition.perServing,
      nutritionComplete: nutrition.complete,
    };
  });
}

/** Lets the diary log recipes by serving. */
export const resolveRecipe: RecipeResolver = async (db, householdId, recipeId) => {
  const [row] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.householdId, householdId)));
  if (!row) return null;
  const [recipe] = await withNutrition(db, [row]);
  return { name: recipe!.name, perServing: recipe!.nutritionPerServing };
};

/** Ingredient amounts for `servings` of a recipe (linked ingredients with grams only). */
function scaledIngredients(recipe: RecipeRow, servings: number) {
  const factor = servings / recipe.servings;
  return recipe.ingredients
    .filter((i) => i.foodId && i.grams)
    .map((i) => ({ foodId: i.foodId!, grams: i.grams! * factor }));
}

export function kitchenRoutes() {
  const app = new Hono<AppEnv>();

  // ---- recipes ----------------------------------------------------------------------

  app.get('/recipes', async (c) => {
    const rows = await c.var.db
      .select()
      .from(recipes)
      .where(eq(recipes.householdId, c.var.user.householdId))
      .orderBy(recipes.name);
    return c.json(await withNutrition(c.var.db, rows));
  });

  app.get('/recipes/:id', async (c) => {
    const id = pathId(c);
    const [row] = await c.var.db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.householdId, c.var.user.householdId)));
    if (!row) notFound('Recipe not found');
    const [recipe] = await withNutrition(c.var.db, [row]);
    return c.json(recipe);
  });

  app.put('/recipes/:id', async (c) => {
    const id = pathId(c);
    const input = await readBody(c, recipeInput);
    if (input.id !== id) fail(400, 'id_mismatch');
    const householdId = c.var.user.householdId;
    const fields = {
      name: input.name,
      servings: input.servings,
      ingredients: input.ingredients,
      instructions: input.instructions,
      tags: input.tags,
      sourceUrl: input.sourceUrl,
    };
    const [row] = await c.var.db
      .insert(recipes)
      .values({ id, householdId, createdBy: c.var.user.id, ...fields })
      .onConflictDoUpdate({
        target: recipes.id,
        set: { ...fields, updatedAt: new Date() },
        setWhere: eq(recipes.householdId, householdId),
      })
      .returning();
    if (!row) fail(409, 'id_conflict');
    const [recipe] = await withNutrition(c.var.db, [row]);
    return c.json(recipe);
  });

  app.delete('/recipes/:id', async (c) => {
    const id = pathId(c);
    await c.var.db
      .delete(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.householdId, c.var.user.householdId)));
    return c.body(null, 204);
  });

  /** Reads a recipe from a web page. Returns a draft; nothing is saved. */
  app.post('/recipes/import', async (c) => {
    const { url } = await readBody(c, importRecipeInput);
    const parsed = new URL(url);
    if (!isAllowedUrl(parsed)) fail(400, 'url_not_allowed', 'Only public web addresses work');
    let imported;
    try {
      imported = await fetchRecipe(parsed.toString(), c.var.deps.fetch);
    } catch (error) {
      fail(502, 'import_failed', `Couldn't load the page: ${(error as Error).message}`);
    }
    if (!imported) {
      fail(422, 'no_recipe_found', "That page doesn't contain recipe data we can read");
    }
    return c.json({
      id: randomUUID(),
      name: imported.name,
      servings: imported.servings,
      ingredients: imported.ingredients.map((i) => ({ foodId: null, ...i })),
      instructions: imported.instructions,
      tags: imported.tags,
      sourceUrl: parsed.toString(),
    });
  });

  // ---- meal plan ----------------------------------------------------------------------

  app.get('/meal-plan', async (c) => {
    const q = readQuery(c, z.object({ from: isoDate, to: isoDate }));
    const rows = await c.var.db
      .select({ entry: mealPlanEntries, recipeName: recipes.name })
      .from(mealPlanEntries)
      .innerJoin(recipes, eq(recipes.id, mealPlanEntries.recipeId))
      .where(
        and(
          eq(mealPlanEntries.householdId, c.var.user.householdId),
          gte(mealPlanEntries.date, q.from),
          lte(mealPlanEntries.date, q.to),
        ),
      )
      .orderBy(mealPlanEntries.date, mealPlanEntries.createdAt);
    const result: MealPlanEntry[] = rows.map(({ entry, recipeName }) => ({
      id: entry.id,
      date: entry.date,
      meal: entry.meal,
      recipeId: entry.recipeId,
      servings: entry.servings,
      recipeName,
    }));
    return c.json(result);
  });

  app.put('/meal-plan/:id', async (c) => {
    const id = pathId(c);
    const input = await readBody(c, mealPlanEntryInput);
    if (input.id !== id) fail(400, 'id_mismatch');
    const householdId = c.var.user.householdId;
    const [recipe] = await c.var.db
      .select({ name: recipes.name })
      .from(recipes)
      .where(and(eq(recipes.id, input.recipeId), eq(recipes.householdId, householdId)));
    if (!recipe) fail(400, 'unknown_recipe', 'Recipe not found');
    const fields = {
      date: input.date,
      meal: input.meal,
      recipeId: input.recipeId,
      servings: input.servings,
    };
    const [row] = await c.var.db
      .insert(mealPlanEntries)
      .values({ id, householdId, ...fields })
      .onConflictDoUpdate({
        target: mealPlanEntries.id,
        set: fields,
        setWhere: eq(mealPlanEntries.householdId, householdId),
      })
      .returning();
    if (!row) fail(409, 'id_conflict');
    return c.json({ ...input, recipeName: recipe.name } satisfies MealPlanEntry);
  });

  app.delete('/meal-plan/:id', async (c) => {
    const id = pathId(c);
    await c.var.db
      .delete(mealPlanEntries)
      .where(
        and(eq(mealPlanEntries.id, id), eq(mealPlanEntries.householdId, c.var.user.householdId)),
      );
    return c.body(null, 204);
  });

  // ---- shopping list -----------------------------------------------------------------------

  app.get('/shopping-list', async (c) => {
    const q = readQuery(c, z.object({ today: isoDate.optional() }));
    const db = c.var.db;
    const householdId = c.var.user.householdId;
    const today = q.today ?? todayIso();
    // Plan from today up to the next shopping day after today.
    const until = nextWeekday(addDays(today, 1), c.var.user.profile.shoppingDay);

    const [allRecipes, plan, bought, eaten, extras] = await Promise.all([
      db.select().from(recipes).where(eq(recipes.householdId, householdId)),
      db
        .select()
        .from(mealPlanEntries)
        .where(
          and(
            eq(mealPlanEntries.householdId, householdId),
            gte(mealPlanEntries.date, today),
            lte(mealPlanEntries.date, until),
          ),
        ),
      db.select().from(purchases).where(eq(purchases.householdId, householdId)),
      db
        .select({
          date: diaryEntries.date,
          foodId: diaryEntries.foodId,
          recipeId: diaryEntries.recipeId,
          grams: diaryEntries.grams,
          servings: diaryEntries.servings,
          createdAt: diaryEntries.createdAt,
        })
        .from(diaryEntries)
        .innerJoin(users, eq(users.id, diaryEntries.userId))
        .where(eq(users.householdId, householdId)),
      db
        .select()
        .from(shoppingExtras)
        .where(eq(shoppingExtras.householdId, householdId))
        .orderBy(shoppingExtras.createdAt),
    ]);
    const recipesById = new Map(allRecipes.map((r) => [r.id, r]));

    // Stock: purchases minus what the household logged eating, as a running balance.
    const events: StockEvent[] = bought.map((p) => ({
      foodId: p.foodId,
      grams: p.grams,
      at: p.purchasedAt.toISOString(),
    }));
    for (const entry of eaten) {
      const at = entry.createdAt.toISOString();
      if (entry.foodId && entry.grams) {
        events.push({ foodId: entry.foodId, grams: -entry.grams, at });
      } else if (entry.recipeId) {
        const recipe = recipesById.get(entry.recipeId);
        if (!recipe) continue;
        for (const i of scaledIngredients(recipe, entry.servings ?? 1)) {
          events.push({ foodId: i.foodId, grams: -i.grams, at });
        }
      }
    }

    // Planned meals already logged that day are eaten, not still needed.
    const loggedMeals = new Set(
      eaten.filter((e) => e.recipeId).map((e) => `${e.date}|${e.recipeId}`),
    );
    const plannedMeals = plan
      .filter((p) => !loggedMeals.has(`${p.date}|${p.recipeId}`))
      .flatMap((p) => {
        const recipe = recipesById.get(p.recipeId);
        return recipe ? [{ date: p.date, ingredients: scaledIngredients(recipe, p.servings) }] : [];
      });

    const result = computeShoppingList({
      today,
      until,
      plannedMeals,
      purchasedGrams: stockFromEvents(events),
      consumedGrams: new Map(),
    });

    const foodIds = result.items.map((i) => i.foodId);
    const names = foodIds.length
      ? await db
          .select({ id: foods.id, name: foods.name })
          .from(foods)
          .where(inArray(foods.id, foodIds))
      : [];
    const nameById = new Map(names.map((n) => [n.id, n.name]));

    const list: ShoppingList = {
      from: today,
      until,
      items: result.items
        .map((i) => ({
          foodId: i.foodId,
          name: nameById.get(i.foodId) ?? 'Unknown food',
          gramsToBuy: i.gramsToBuy,
          gramsNeeded: Math.round(i.gramsNeeded),
          gramsInStock: Math.round(i.gramsInStock),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      extras: extras.map((e) => ({ id: e.id, text: e.text, done: e.done })),
      coveredUntil: result.coveredUntil,
      daysUntilShopping: result.daysUntilShopping,
    };
    return c.json(list);
  });

  /** Ticking an item off the list records that it was bought. */
  app.put('/purchases/:id', async (c) => {
    const id = pathId(c);
    const input = await readBody(c, purchaseInput);
    if (input.id !== id) fail(400, 'id_mismatch');
    const householdId = c.var.user.householdId;
    const [food] = await c.var.db
      .select({ id: foods.id })
      .from(foods)
      .where(and(eq(foods.id, input.foodId), eq(foods.householdId, householdId)));
    if (!food) fail(400, 'unknown_food', 'Food not found');
    await c.var.db
      .insert(purchases)
      .values({ id, householdId, foodId: input.foodId, grams: input.grams })
      .onConflictDoNothing();
    return c.json(input);
  });

  app.delete('/purchases/:id', async (c) => {
    const id = pathId(c);
    await c.var.db
      .delete(purchases)
      .where(and(eq(purchases.id, id), eq(purchases.householdId, c.var.user.householdId)));
    return c.body(null, 204);
  });

  app.put('/shopping-extras/:id', async (c) => {
    const id = pathId(c);
    const input = await readBody(c, shoppingExtraInput);
    if (input.id !== id) fail(400, 'id_mismatch');
    const householdId = c.var.user.householdId;
    const [row] = await c.var.db
      .insert(shoppingExtras)
      .values({ id, householdId, text: input.text, done: input.done })
      .onConflictDoUpdate({
        target: shoppingExtras.id,
        set: { text: input.text, done: input.done },
        setWhere: eq(shoppingExtras.householdId, householdId),
      })
      .returning();
    if (!row) fail(409, 'id_conflict');
    return c.json(input);
  });

  /** Clears ticked-off extras. */
  app.delete('/shopping-extras', async (c) => {
    await c.var.db
      .delete(shoppingExtras)
      .where(
        and(
          eq(shoppingExtras.householdId, c.var.user.householdId),
          eq(shoppingExtras.done, true),
          isNotNull(shoppingExtras.id),
        ),
      );
    return c.body(null, 204);
  });

  app.delete('/shopping-extras/:id', async (c) => {
    const id = pathId(c);
    await c.var.db
      .delete(shoppingExtras)
      .where(
        and(eq(shoppingExtras.id, id), eq(shoppingExtras.householdId, c.var.user.householdId)),
      );
    return c.body(null, 204);
  });

  return app;
}
