/**
 * Recipe import from a web page. Most recipe sites publish schema.org `Recipe` data as
 * JSON-LD for search engines; we read that, like Mealie does.
 */

export interface ImportedRecipe {
  name: string;
  servings: number;
  ingredients: { text: string; grams: number | null }[];
  instructions: string;
  tags: string[];
}

const MAX_BYTES = 3 * 1024 * 1024;

function isRecipe(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== 'object') return false;
  const type = (node as Record<string, unknown>)['@type'];
  return type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'));
}

function findRecipe(data: unknown): Record<string, unknown> | null {
  if (isRecipe(data)) return data;
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipe(item);
      if (found) return found;
    }
  } else if (data && typeof data === 'object') {
    const graph = (data as Record<string, unknown>)['@graph'];
    if (graph) return findRecipe(graph);
  }
  return null;
}

function text(value: unknown): string {
  if (typeof value === 'string') return decodeEntities(value.replace(/<[^>]+>/g, '')).trim();
  if (value && typeof value === 'object' && 'text' in value) return text(value.text);
  return '';
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)));
}

function instructionsOf(value: unknown): string[] {
  if (typeof value === 'string') return [text(value)].filter(Boolean);
  if (Array.isArray(value)) return value.flatMap(instructionsOf);
  if (value && typeof value === 'object') {
    const node = value as Record<string, unknown>;
    if (node['@type'] === 'HowToSection') {
      const name = text(node.name);
      return [...(name ? [`${name}:`] : []), ...instructionsOf(node.itemListElement)];
    }
    return [text(node.text ?? node.name)].filter(Boolean);
  }
  return [];
}

function servingsOf(value: unknown): number {
  const first = Array.isArray(value) ? value[0] : value;
  const match = /(\d+(?:[.,]\d+)?)/.exec(String(first ?? ''));
  const n = match ? Number(match[1]!.replace(',', '.')) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : 4;
}

/** Grams from simple metric amounts: "200 g flour", "1.5 kg potatoes", "250ml milk". */
export function gramsFromText(line: string): number | null {
  const match = /(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gram|grams|ml|l)\b/i.exec(line);
  if (!match) return null;
  const value = Number(match[1]!.replace(',', '.'));
  const unit = match[2]!.toLowerCase();
  const grams = unit === 'kg' || unit === 'l' ? value * 1000 : value;
  return grams > 0 ? Math.round(grams * 10) / 10 : null;
}

export function parseRecipeHtml(html: string): ImportedRecipe | null {
  const scripts = html.matchAll(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const [, body] of scripts) {
    let data: unknown;
    try {
      data = JSON.parse(body!.trim());
    } catch {
      continue;
    }
    const recipe = findRecipe(data);
    if (!recipe) continue;

    const ingredients = (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : [])
      .map((line) => text(line))
      .filter(Boolean)
      .slice(0, 100)
      .map((line) => ({ text: line.slice(0, 200), grams: gramsFromText(line) }));
    const keywords =
      typeof recipe.keywords === 'string'
        ? recipe.keywords.split(',')
        : Array.isArray(recipe.keywords)
          ? recipe.keywords.map(String)
          : [];
    const category = Array.isArray(recipe.recipeCategory)
      ? recipe.recipeCategory.map(String)
      : recipe.recipeCategory
        ? [String(recipe.recipeCategory)]
        : [];

    return {
      name: text(recipe.name).slice(0, 120) || 'Imported recipe',
      servings: servingsOf(recipe.recipeYield),
      ingredients,
      instructions: instructionsOf(recipe.recipeInstructions)
        .map((step, i, all) => (all.length > 1 && !step.endsWith(':') ? `${i + 1}. ${step}` : step))
        .join('\n')
        .slice(0, 20000),
      tags: [...new Set([...category, ...keywords].map((t) => t.trim()).filter(Boolean))]
        .map((t) => t.slice(0, 30))
        .slice(0, 20),
    };
  }
  return null;
}

/** Refuses obviously internal addresses so the import can't be used to probe the LAN. */
export function isAllowedUrl(url: URL): boolean {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (host.startsWith('[') || host === '::1') return false;
  return true;
}

export async function fetchRecipe(
  url: string,
  fetchFn: typeof fetch,
): Promise<ImportedRecipe | null> {
  const res = await fetchFn(url, {
    headers: {
      accept: 'text/html',
      'user-agent': 'Mozilla/5.0 (compatible; VigorTally recipe import)',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`The page answered ${res.status}`);
  const length = Number(res.headers.get('content-length') ?? 0);
  if (length > MAX_BYTES) throw new Error('The page is too large');
  const html = (await res.text()).slice(0, MAX_BYTES);
  return parseRecipeHtml(html);
}
