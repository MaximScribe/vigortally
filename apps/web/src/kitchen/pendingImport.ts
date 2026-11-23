import type { RecipeInput } from '@vigortally/schema';

/** An imported recipe draft waiting to be opened in the editor (one-shot hand-over). */
let pending: RecipeInput | null = null;

export function setPendingImport(draft: RecipeInput): void {
  pending = draft;
}

export function takePendingImport(): RecipeInput | null {
  const draft = pending;
  pending = null;
  return draft;
}
