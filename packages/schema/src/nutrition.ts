import { z } from 'zod';
import { amount, id, isoDate } from './common';

/** Nutrient amounts. Energy in kcal, everything else in grams. */
export const nutrients = z.object({
  kcal: amount(100000),
  protein: amount(10000),
  carbs: amount(10000),
  fat: amount(10000),
  fiber: amount(10000).optional(),
  sugar: amount(10000).optional(),
  salt: amount(10000).optional(),
});
export type Nutrients = z.infer<typeof nutrients>;

export const serving = z.object({
  label: z.string().trim().min(1).max(60),
  grams: z.number().positive().max(10000),
});
export type Serving = z.infer<typeof serving>;

export const foodSource = z.enum(['custom', 'openfoodfacts']);
export type FoodSource = z.infer<typeof foodSource>;

export const food = z.object({
  id,
  name: z.string().trim().min(1).max(160),
  brand: z.string().trim().max(120).nullable().default(null),
  barcode: z
    .string()
    .regex(/^\d{6,14}$/, 'Barcodes are 6–14 digits')
    .nullable()
    .default(null),
  source: foodSource.default('custom'),
  /** Nutrients per 100 g (or 100 ml for drinks). */
  per100g: nutrients,
  servings: z.array(serving).max(20).default([]),
});
export type Food = z.infer<typeof food>;
export const foodInput = food;
export type FoodInput = z.input<typeof foodInput>;

export const meal = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type Meal = z.infer<typeof meal>;
export const meals = meal.options;

/** How much was eaten: grams of a food, or servings of a recipe. */
export const quantity = z.union([
  z.object({ grams: z.number().positive().max(10000) }),
  z.object({ servings: z.number().positive().max(100) }),
]);
export type Quantity = z.infer<typeof quantity>;

export const diaryEntryInput = z
  .object({
    id,
    date: isoDate,
    meal,
    foodId: id.optional(),
    recipeId: id.optional(),
    /** Quick add: name and nutrients without a food or recipe. */
    quickAdd: z.object({ name: z.string().trim().min(1).max(160), nutrients }).optional(),
    quantity: quantity.optional(),
  })
  .refine((entry) => [entry.foodId, entry.recipeId, entry.quickAdd].filter(Boolean).length === 1, {
    message: 'Give exactly one of foodId, recipeId or quickAdd',
  })
  .refine((entry) => entry.quickAdd != null || entry.quantity != null, {
    message: 'quantity is required for foods and recipes',
    path: ['quantity'],
  });
export type DiaryEntryInput = z.infer<typeof diaryEntryInput>;

/** A logged item. Nutrients are a snapshot taken when it was logged. */
export const diaryEntry = z.object({
  id,
  date: isoDate,
  meal,
  foodId: id.nullable(),
  recipeId: id.nullable(),
  name: z.string(),
  grams: z.number().nullable(),
  servings: z.number().nullable(),
  nutrients,
  createdAt: z.string(),
});
export type DiaryEntry = z.infer<typeof diaryEntry>;

export const waterEntryInput = z.object({
  id,
  date: isoDate,
  ml: z.number().int().min(-5000).max(5000),
});
export type WaterEntryInput = z.infer<typeof waterEntryInput>;

export const weighInInput = z.object({
  id,
  date: isoDate,
  weightKg: z.number().min(20).max(400),
});
export type WeighInInput = z.infer<typeof weighInInput>;
export const weighIn = weighInInput;
export type WeighIn = z.infer<typeof weighIn>;

export const dayNutrition = z.object({
  date: isoDate,
  entries: z.array(diaryEntry),
  totals: nutrients,
  waterMl: z.number(),
  weighIn: weighIn.nullable(),
});
export type DayNutrition = z.infer<typeof dayNutrition>;
