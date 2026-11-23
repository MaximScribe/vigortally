/**
 * The shopping list, worked out from data the user already enters. Nothing is counted
 * by hand:
 *
 *   in stock  = bought (ticked off the list)  −  eaten (logged in the diary)
 *   needed    = ingredients of meals planned from today up to the shopping day
 *   to buy    = needed − in stock
 *
 * It covers the basics for scheduled recipes; extra purchases or off-plan meals don't
 * break it, they just make the stock estimate a little less exact.
 */
import { addDays, daysBetween, eachDay, type IsoDate } from './dates';

export interface PlannedMeal {
  date: IsoDate;
  /** Ingredients needed for this meal (already scaled to the planned servings). */
  ingredients: readonly { foodId: string; grams: number }[];
}

export interface ShoppingInput {
  today: IsoDate;
  /** Last day the list should cover (usually the next shopping day). */
  until: IsoDate;
  plannedMeals: readonly PlannedMeal[];
  /** Grams bought per food (all time, or since the user started tracking). */
  purchasedGrams: ReadonlyMap<string, number>;
  /** Grams eaten per food over the same period. */
  consumedGrams: ReadonlyMap<string, number>;
}

export interface ShoppingLine {
  foodId: string;
  gramsNeeded: number;
  gramsInStock: number;
  gramsToBuy: number;
}

export interface ShoppingResult {
  items: ShoppingLine[];
  /** Last day whose planned meals are fully covered; null if nothing is planned. */
  coveredUntil: IsoDate | null;
  /** Days from today until the first shortfall (0 = today); null if nothing is planned. */
  daysUntilShopping: number | null;
}

/** Assumed stock per food: bought minus eaten, never below zero. */
export function estimateStock(
  purchased: ReadonlyMap<string, number>,
  consumed: ReadonlyMap<string, number>,
): Map<string, number> {
  const stock = new Map<string, number>();
  for (const [foodId, grams] of purchased) {
    stock.set(foodId, Math.max(0, grams - (consumed.get(foodId) ?? 0)));
  }
  return stock;
}

export function computeShoppingList(input: ShoppingInput): ShoppingResult {
  const stock = estimateStock(input.purchasedGrams, input.consumedGrams);
  const meals = input.plannedMeals.filter((m) => m.date >= input.today && m.date <= input.until);

  // Total need per food in the window.
  const needed = new Map<string, number>();
  for (const meal of meals) {
    for (const { foodId, grams } of meal.ingredients) {
      needed.set(foodId, (needed.get(foodId) ?? 0) + grams);
    }
  }

  const items: ShoppingLine[] = [...needed]
    .map(([foodId, gramsNeeded]) => {
      const gramsInStock = stock.get(foodId) ?? 0;
      return {
        foodId,
        gramsNeeded,
        gramsInStock,
        gramsToBuy: Math.max(0, Math.ceil(gramsNeeded - gramsInStock)),
      };
    })
    .filter((item) => item.gramsToBuy > 0)
    .sort((a, b) => b.gramsToBuy - a.gramsToBuy || a.foodId.localeCompare(b.foodId));

  if (meals.length === 0) return { items, coveredUntil: null, daysUntilShopping: null };

  // Walk day by day, using up the stock, until something runs short.
  const remaining = new Map(stock);
  const lastPlanned = meals.reduce((max, m) => (m.date > max ? m.date : max), input.today);
  for (const day of eachDay(input.today, lastPlanned)) {
    for (const meal of meals.filter((m) => m.date === day)) {
      for (const { foodId, grams } of meal.ingredients) {
        const left = (remaining.get(foodId) ?? 0) - grams;
        if (left < -0.5) {
          return {
            items,
            coveredUntil: day === input.today ? null : addDays(day, -1),
            daysUntilShopping: daysBetween(input.today, day),
          };
        }
        remaining.set(foodId, left);
      }
    }
  }

  return {
    items,
    coveredUntil: lastPlanned,
    daysUntilShopping: daysBetween(input.today, lastPlanned) + 1,
  };
}
