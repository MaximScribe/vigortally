import type { Nutrients, Serving } from '@vigortally/schema';
import { SERVER_VERSION } from '../meta';

/** What we take from an Open Food Facts product. */
export interface OffProduct {
  name: string;
  brand: string | null;
  per100g: Nutrients;
  servings: Serving[];
}

const FIELDS = 'product_name,generic_name,brands,nutriments,serving_quantity,serving_size';

/**
 * Looks up a barcode on Open Food Facts (https://world.openfoodfacts.org, ODbL).
 * Only the barcode is sent. Returns null when the product is unknown or has no nutrients.
 */
export async function lookupBarcode(
  barcode: string,
  fetchFn: typeof fetch,
): Promise<OffProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`;
  const res = await fetchFn(url, {
    headers: { 'user-agent': `VigorTally/${SERVER_VERSION} (self-hosted)` },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts answered ${res.status}`);
  const data = (await res.json()) as { status?: number; product?: Record<string, unknown> };
  if (data.status !== 1 || !data.product) return null;
  return parseProduct(data.product);
}

function num(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseProduct(product: Record<string, unknown>): OffProduct | null {
  const n = (product.nutriments ?? {}) as Record<string, unknown>;
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) ?? NaN) / 4.184;
  const protein = num(n['proteins_100g']);
  const carbs = num(n['carbohydrates_100g']);
  const fat = num(n['fat_100g']);
  if (!Number.isFinite(kcal) || protein == null || carbs == null || fat == null) return null;

  const per100g: Nutrients = {
    kcal: Math.round(kcal),
    protein: round(protein),
    carbs: round(carbs),
    fat: round(fat),
  };
  const fiber = num(n['fiber_100g']);
  const sugar = num(n['sugars_100g']);
  const salt = num(n['salt_100g']);
  if (fiber != null) per100g.fiber = round(fiber);
  if (sugar != null) per100g.sugar = round(sugar);
  if (salt != null) per100g.salt = round(salt);

  const servings: Serving[] = [];
  const servingGrams = num(product.serving_quantity);
  if (servingGrams && servingGrams > 0 && servingGrams <= 10000) {
    const label = typeof product.serving_size === 'string' ? product.serving_size.trim() : '';
    servings.push({ label: (label || `${servingGrams} g`).slice(0, 60), grams: servingGrams });
  }

  const name =
    (typeof product.product_name === 'string' && product.product_name.trim()) ||
    (typeof product.generic_name === 'string' && product.generic_name.trim()) ||
    'Unnamed product';
  const brand =
    typeof product.brands === 'string' ? product.brands.split(',')[0]?.trim() || null : null;
  return { name: name.slice(0, 160), brand: brand?.slice(0, 120) ?? null, per100g, servings };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
