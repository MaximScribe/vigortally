import { randomUUID } from 'node:crypto';
import { nutrientsForGrams, roundNutrients, scaleNutrients, sumNutrients } from '@vigortally/core';
import {
  diaryEntryInput,
  foodInput,
  id as idSchema,
  isoDate,
  waterEntryInput,
  weighInInput,
  type DayNutrition,
  type DiaryEntry,
  type Food,
  type Nutrients,
} from '@vigortally/schema';
import { and, desc, eq, gte, ilike, lte, max, or, sql, sum } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context';
import type { Database } from '../db/client';
import { diaryEntries, foods, waterEntries, weighIns } from '../db/schema';
import { fail, notFound } from '../http/errors';
import { readBody, readQuery } from '../http/validate';
import { lookupBarcode } from '../lib/openFoodFacts';

function pathId(c: Context): string {
  const result = idSchema.safeParse(c.req.param('id'));
  if (!result.success) notFound();
  return result.data;
}

type FoodRow = typeof foods.$inferSelect;
export function toFood(row: FoodRow): Food {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    barcode: row.barcode,
    source: row.source as Food['source'],
    per100g: row.per100g,
    servings: row.servings,
  };
}

type DiaryRow = typeof diaryEntries.$inferSelect;
function toEntry(row: DiaryRow): DiaryEntry {
  return {
    id: row.id,
    date: row.date,
    meal: row.meal,
    foodId: row.foodId,
    recipeId: row.recipeId,
    name: row.name,
    grams: row.grams,
    servings: row.servings,
    nutrients: row.nutrients,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Resolves what a diary entry refers to. Recipes are resolved by a function the kitchen
 * module registers, so this module doesn't depend on it.
 */
export type RecipeResolver = (
  db: Database,
  householdId: string,
  recipeId: string,
) => Promise<{ name: string; perServing: Nutrients } | null>;

export async function loadDay(db: Database, userId: string, date: string): Promise<DayNutrition> {
  const [entries, water, weigh] = await Promise.all([
    db
      .select()
      .from(diaryEntries)
      .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.date, date)))
      .orderBy(diaryEntries.createdAt),
    db
      .select({ ml: sum(waterEntries.ml).mapWith(Number) })
      .from(waterEntries)
      .where(and(eq(waterEntries.userId, userId), eq(waterEntries.date, date))),
    db
      .select()
      .from(weighIns)
      .where(and(eq(weighIns.userId, userId), eq(weighIns.date, date))),
  ]);
  const list = entries.map(toEntry);
  return {
    date,
    entries: list,
    totals: roundNutrients(sumNutrients(list.map((e) => e.nutrients))),
    waterMl: Math.max(0, water[0]?.ml ?? 0),
    weighIn: weigh[0]
      ? { id: weigh[0].id, date: weigh[0].date, weightKg: weigh[0].weightKg }
      : null,
  };
}

export function nutritionRoutes(resolveRecipe: RecipeResolver) {
  const app = new Hono<AppEnv>();

  // ---- foods -----------------------------------------------------------------

  app.get('/foods', async (c) => {
    const q = readQuery(
      c,
      z.object({
        q: z.string().trim().max(100).default(''),
        limit: z.coerce.number().int().min(1).max(100).default(30),
      }),
    );
    const conditions = [eq(foods.householdId, c.var.user.householdId)];
    for (const word of q.q.split(/\s+/).filter(Boolean)) {
      const pattern = `%${word.replace(/[%_\\]/g, '\\$&')}%`;
      conditions.push(or(ilike(foods.name, pattern), ilike(foods.brand, pattern))!);
    }
    const rows = await c.var.db
      .select()
      .from(foods)
      .where(and(...conditions))
      .orderBy(foods.name)
      .limit(q.limit);
    return c.json(rows.map(toFood));
  });

  /** Foods this user logged most recently, for one-tap re-logging. */
  app.get('/foods/recent', async (c) => {
    const recent = await c.var.db
      .select({ foodId: diaryEntries.foodId, last: max(diaryEntries.createdAt) })
      .from(diaryEntries)
      .where(and(eq(diaryEntries.userId, c.var.user.id), sql`${diaryEntries.foodId} is not null`))
      .groupBy(diaryEntries.foodId)
      .orderBy(desc(max(diaryEntries.createdAt)))
      .limit(20);
    const ids = recent.map((r) => r.foodId!);
    if (ids.length === 0) return c.json([]);
    const rows = await c.var.db
      .select()
      .from(foods)
      .where(
        and(
          eq(foods.householdId, c.var.user.householdId),
          sql`${foods.id} in (${sql.join(
            ids.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        ),
      );
    const byId = new Map(rows.map((r) => [r.id, r]));
    return c.json(ids.flatMap((id) => (byId.has(id) ? [toFood(byId.get(id)!)] : [])));
  });

  /** Barcode lookup: the household's foods first, then Open Food Facts (cached). */
  app.get('/foods/barcode/:code', async (c) => {
    const code = c.req.param('code');
    if (!/^\d{6,14}$/.test(code)) fail(400, 'invalid_barcode', 'Barcodes are 6–14 digits');
    const householdId = c.var.user.householdId;

    const [existing] = await c.var.db
      .select()
      .from(foods)
      .where(and(eq(foods.householdId, householdId), eq(foods.barcode, code)));
    if (existing) return c.json(toFood(existing));

    let product;
    try {
      product = await lookupBarcode(code, c.var.deps.fetch);
    } catch (error) {
      c.var.deps.log.warn('Open Food Facts lookup failed', { error: String(error) });
      fail(502, 'lookup_failed', "Couldn't reach Open Food Facts. Add the food by hand.");
    }
    if (!product) notFound('This barcode is not in Open Food Facts yet');

    const [row] = await c.var.db
      .insert(foods)
      .values({
        id: randomUUID(),
        householdId,
        createdBy: c.var.user.id,
        barcode: code,
        source: 'openfoodfacts',
        ...product,
      })
      .onConflictDoNothing()
      .returning();
    if (row) return c.json(toFood(row));
    // Someone else cached it at the same moment.
    const [cached] = await c.var.db
      .select()
      .from(foods)
      .where(and(eq(foods.householdId, householdId), eq(foods.barcode, code)));
    return c.json(toFood(cached!));
  });

  app.put('/foods/:id', async (c) => {
    const id = pathId(c);
    const input = await readBody(c, foodInput);
    if (input.id !== id) fail(400, 'id_mismatch');
    const householdId = c.var.user.householdId;
    const values = {
      id,
      householdId,
      createdBy: c.var.user.id,
      name: input.name,
      brand: input.brand,
      barcode: input.barcode,
      source: input.source,
      per100g: input.per100g,
      servings: input.servings,
    };
    let rows;
    try {
      rows = await c.var.db
        .insert(foods)
        .values(values)
        .onConflictDoUpdate({
          target: foods.id,
          set: {
            name: input.name,
            brand: input.brand,
            barcode: input.barcode,
            per100g: input.per100g,
            servings: input.servings,
          },
          setWhere: eq(foods.householdId, householdId),
        })
        .returning();
    } catch {
      fail(409, 'barcode_taken', 'Another food already has this barcode');
    }
    if (!rows[0]) fail(409, 'id_conflict');
    return c.json(toFood(rows[0]));
  });

  app.delete('/foods/:id', async (c) => {
    const id = pathId(c);
    await c.var.db
      .delete(foods)
      .where(and(eq(foods.id, id), eq(foods.householdId, c.var.user.householdId)));
    return c.body(null, 204);
  });

  // ---- diary ---------------------------------------------------------------------

  app.get('/diary', async (c) => {
    const { date } = readQuery(c, z.object({ date: isoDate }));
    return c.json(await loadDay(c.var.db, c.var.user.id, date));
  });

  app.put('/diary/:id', async (c) => {
    const id = pathId(c);
    const input = await readBody(c, diaryEntryInput);
    if (input.id !== id) fail(400, 'id_mismatch');

    let name: string;
    let nutrients: Nutrients;
    let grams: number | null = null;
    let servings: number | null = null;

    if (input.quickAdd) {
      name = input.quickAdd.name;
      nutrients = input.quickAdd.nutrients;
    } else if (input.foodId) {
      const [food] = await c.var.db
        .select()
        .from(foods)
        .where(and(eq(foods.id, input.foodId), eq(foods.householdId, c.var.user.householdId)));
      if (!food) fail(400, 'unknown_food', 'Food not found');
      const qty = input.quantity!;
      grams = 'grams' in qty ? qty.grams : qty.servings * (food.servings[0]?.grams ?? 100);
      if ('servings' in qty) servings = qty.servings;
      name = food.brand ? `${food.name} (${food.brand})` : food.name;
      nutrients = nutrientsForGrams(food.per100g, grams);
    } else {
      const recipe = await resolveRecipe(c.var.db, c.var.user.householdId, input.recipeId!);
      if (!recipe) fail(400, 'unknown_recipe', 'Recipe not found');
      const qty = input.quantity!;
      servings = 'servings' in qty ? qty.servings : 1;
      name = recipe.name;
      nutrients = scaleNutrients(recipe.perServing, servings);
    }

    const values = {
      id,
      userId: c.var.user.id,
      date: input.date,
      meal: input.meal,
      foodId: input.foodId ?? null,
      recipeId: input.recipeId ?? null,
      name,
      grams,
      servings,
      nutrients: roundNutrients(nutrients),
    };
    const { id: _id, userId: _userId, ...update } = values;
    const [row] = await c.var.db
      .insert(diaryEntries)
      .values(values)
      .onConflictDoUpdate({
        target: diaryEntries.id,
        set: update,
        setWhere: eq(diaryEntries.userId, c.var.user.id),
      })
      .returning();
    if (!row) fail(409, 'id_conflict');
    return c.json(toEntry(row));
  });

  app.delete('/diary/:id', async (c) => {
    const id = pathId(c);
    await c.var.db
      .delete(diaryEntries)
      .where(and(eq(diaryEntries.id, id), eq(diaryEntries.userId, c.var.user.id)));
    return c.body(null, 204);
  });

  // ---- water and weight ------------------------------------------------------------

  app.put('/water/:id', async (c) => {
    const id = pathId(c);
    const input = await readBody(c, waterEntryInput);
    if (input.id !== id) fail(400, 'id_mismatch');
    await c.var.db
      .insert(waterEntries)
      .values({ id, userId: c.var.user.id, date: input.date, ml: input.ml })
      .onConflictDoNothing();
    return c.json(await loadDay(c.var.db, c.var.user.id, input.date));
  });

  app.put('/weigh-ins/:id', async (c) => {
    const id = pathId(c);
    const input = await readBody(c, weighInInput);
    if (input.id !== id) fail(400, 'id_mismatch');
    const [row] = await c.var.db
      .insert(weighIns)
      .values({ id, userId: c.var.user.id, date: input.date, weightKg: input.weightKg })
      .onConflictDoUpdate({
        target: [weighIns.userId, weighIns.date],
        set: { weightKg: input.weightKg },
      })
      .returning();
    return c.json({ id: row!.id, date: row!.date, weightKg: row!.weightKg });
  });

  app.get('/weigh-ins', async (c) => {
    const q = readQuery(c, z.object({ from: isoDate.optional(), to: isoDate.optional() }));
    const conditions = [eq(weighIns.userId, c.var.user.id)];
    if (q.from) conditions.push(gte(weighIns.date, q.from));
    if (q.to) conditions.push(lte(weighIns.date, q.to));
    const rows = await c.var.db
      .select({ id: weighIns.id, date: weighIns.date, weightKg: weighIns.weightKg })
      .from(weighIns)
      .where(and(...conditions))
      .orderBy(weighIns.date);
    return c.json(rows);
  });

  app.delete('/weigh-ins/:id', async (c) => {
    const id = pathId(c);
    await c.var.db
      .delete(weighIns)
      .where(and(eq(weighIns.id, id), eq(weighIns.userId, c.var.user.id)));
    return c.body(null, 204);
  });

  return app;
}
