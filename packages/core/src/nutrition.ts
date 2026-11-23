import type { Nutrients } from '@vigortally/schema';

export const emptyNutrients = (): Nutrients => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 });

const optionalKeys = ['fiber', 'sugar', 'salt'] as const;

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Rounds for storage and display: kcal to whole numbers, grams to one decimal. */
export function roundNutrients(n: Nutrients): Nutrients {
  const result: Nutrients = {
    kcal: Math.round(n.kcal),
    protein: round(n.protein),
    carbs: round(n.carbs),
    fat: round(n.fat),
  };
  for (const key of optionalKeys) {
    const value = n[key];
    if (value != null) result[key] = round(value);
  }
  return result;
}

/** Multiplies every nutrient by `factor`. */
export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  const result: Nutrients = {
    kcal: n.kcal * factor,
    protein: n.protein * factor,
    carbs: n.carbs * factor,
    fat: n.fat * factor,
  };
  for (const key of optionalKeys) {
    const value = n[key];
    if (value != null) result[key] = value * factor;
  }
  return result;
}

/** Nutrients in `grams` of a food given its values per 100 g. */
export function nutrientsForGrams(per100g: Nutrients, grams: number): Nutrients {
  return scaleNutrients(per100g, grams / 100);
}

/** Adds up nutrients. Optional nutrients are only included if at least one item has them. */
export function sumNutrients(items: readonly Nutrients[]): Nutrients {
  const total = emptyNutrients();
  for (const item of items) {
    total.kcal += item.kcal;
    total.protein += item.protein;
    total.carbs += item.carbs;
    total.fat += item.fat;
    for (const key of optionalKeys) {
      const value = item[key];
      if (value != null) total[key] = (total[key] ?? 0) + value;
    }
  }
  return total;
}

export interface RecipeIngredientNutrition {
  /** Values per 100 g of the linked food, or null if the ingredient isn't linked. */
  per100g: Nutrients | null;
  grams: number | null;
}

export interface RecipeNutrition {
  total: Nutrients;
  perServing: Nutrients;
  /** False when at least one ingredient couldn't be counted. */
  complete: boolean;
}

/** Nutrition of a recipe from its linked ingredients. */
export function recipeNutrition(
  ingredients: readonly RecipeIngredientNutrition[],
  servings: number,
): RecipeNutrition {
  let complete = true;
  const parts: Nutrients[] = [];
  for (const ingredient of ingredients) {
    if (!ingredient.per100g || ingredient.grams == null) {
      complete = false;
      continue;
    }
    parts.push(nutrientsForGrams(ingredient.per100g, ingredient.grams));
  }
  const total = sumNutrients(parts);
  return {
    total: roundNutrients(total),
    perServing: roundNutrients(scaleNutrients(total, 1 / Math.max(servings, Number.EPSILON))),
    complete,
  };
}

export interface MacroSplit {
  protein: number;
  carbs: number;
  fat: number;
}

/** Share of energy from each macro, 0–1. Uses 4 / 4 / 9 kcal per gram. */
export function macroEnergySplit(n: Pick<Nutrients, 'protein' | 'carbs' | 'fat'>): MacroSplit {
  const protein = n.protein * 4;
  const carbs = n.carbs * 4;
  const fat = n.fat * 9;
  const total = protein + carbs + fat;
  if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
  return { protein: protein / total, carbs: carbs / total, fat: fat / total };
}
