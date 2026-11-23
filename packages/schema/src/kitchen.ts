import { z } from 'zod';
import { id, isoDate } from './common';
import { meal, nutrients } from './nutrition';

export const ingredient = z.object({
  /** Linked food. Unlinked ingredients still show in the recipe but can't be tracked. */
  foodId: id.nullable().default(null),
  /** Free text as written in the recipe ("2 onions, diced"). */
  text: z.string().trim().min(1).max(200),
  /** Amount in grams, needed for nutrition and the shopping list. */
  grams: z.number().positive().max(100000).nullable().default(null),
});
export type Ingredient = z.infer<typeof ingredient>;

export const recipeInput = z.object({
  id,
  name: z.string().trim().min(1).max(120),
  servings: z.number().positive().max(100),
  ingredients: z.array(ingredient).max(100),
  instructions: z.string().max(20000).default(''),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
  sourceUrl: z.url().nullable().default(null),
});
export type RecipeInput = z.input<typeof recipeInput>;

export const recipe = recipeInput.extend({
  /** Per serving, from linked ingredients. */
  nutritionPerServing: nutrients,
  /** False when some ingredients are not linked to a food or have no amount. */
  nutritionComplete: z.boolean(),
});
export type Recipe = z.infer<typeof recipe>;

export const importRecipeInput = z.object({ url: z.url() });

export const mealPlanEntryInput = z.object({
  id,
  date: isoDate,
  meal,
  recipeId: id,
  servings: z.number().positive().max(100),
});
export type MealPlanEntryInput = z.infer<typeof mealPlanEntryInput>;
export const mealPlanEntry = mealPlanEntryInput.extend({ recipeName: z.string() });
export type MealPlanEntry = z.infer<typeof mealPlanEntry>;

/** Ticking an item off the shopping list records a purchase. */
export const purchaseInput = z.object({
  id,
  foodId: id,
  grams: z.number().positive().max(100000),
});
export type PurchaseInput = z.infer<typeof purchaseInput>;

/** Things to buy that aren't in any recipe (added by hand). */
export const shoppingExtraInput = z.object({
  id,
  text: z.string().trim().min(1).max(120),
  done: z.boolean().default(false),
});
export type ShoppingExtraInput = z.input<typeof shoppingExtraInput>;
export const shoppingExtra = shoppingExtraInput;
export type ShoppingExtra = z.infer<typeof shoppingExtra>;

export const shoppingItem = z.object({
  foodId: id,
  name: z.string(),
  /** Still needed for the planned meals up to the shopping day. */
  gramsToBuy: z.number(),
  /** Needed in total in the planning window. */
  gramsNeeded: z.number(),
  /** Assumed to be at home (bought minus eaten). */
  gramsInStock: z.number(),
});
export type ShoppingItem = z.infer<typeof shoppingItem>;

export const shoppingList = z.object({
  from: isoDate,
  until: isoDate,
  items: z.array(shoppingItem),
  extras: z.array(shoppingExtra),
  /** Last day the planned meals are covered by what's at home; null if nothing is planned. */
  coveredUntil: isoDate.nullable(),
  /** Days from today until something runs out (0 = shop today). */
  daysUntilShopping: z.number().int().nullable(),
});
export type ShoppingList = z.infer<typeof shoppingList>;
