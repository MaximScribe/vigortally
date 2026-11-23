import { recipeNutrition } from '@vigortally/core';
import type { Food, Ingredient, RecipeInput } from '@vigortally/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Link2, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApi } from '../api/ApiProvider';
import { Button, ErrorMessage, TextField } from '../components/forms';
import { EmptyState, Page, Section } from '../components/Page';
import { Sheet } from '../components/Sheet';
import { formatNumber } from '../lib/format';
import { newId } from '../lib/ids';
import { SearchFoods } from '../nutrition/AddFoodSheet';
import { takePendingImport } from './pendingImport';
import './kitchen.css';

export function RecipeEditorPage() {
  const { recipeId } = useParams({ from: '/kitchen/recipes/$recipeId' });
  const api = useApi();
  const isNew = recipeId === 'new';
  const recipe = useQuery({
    queryKey: ['recipes', recipeId],
    queryFn: () => api.recipes.get(recipeId),
    enabled: !isNew,
  });
  // Read the imported draft once, when the editor opens.
  const [imported] = useState(() => (isNew ? takePendingImport() : null));

  if (!isNew && recipe.isPending) return null;
  if (!isNew && !recipe.data) {
    return (
      <Page title="Recipe">
        <EmptyState title="Recipe not found">It may have been deleted.</EmptyState>
      </Page>
    );
  }
  const initial: RecipeInput = recipe.data ??
    imported ?? {
      id: newId(),
      name: '',
      servings: 4,
      ingredients: [],
      instructions: '',
      tags: [],
      sourceUrl: null,
    };
  return <Editor key={initial.id} initial={initial} isNew={isNew} />;
}

interface Draft {
  id: string;
  name: string;
  servings: string;
  ingredients: Ingredient[];
  instructions: string;
  tags: string;
  sourceUrl: string | null;
}

function Editor({ initial, isNew }: { initial: RecipeInput; isNew: boolean }) {
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>({
    id: initial.id,
    name: initial.name,
    servings: String(initial.servings),
    ingredients: (initial.ingredients ?? []).map((i) => ({
      foodId: i.foodId ?? null,
      text: i.text,
      grams: i.grams ?? null,
    })),
    instructions: initial.instructions ?? '',
    tags: (initial.tags ?? []).join(', '),
    sourceUrl: initial.sourceUrl ?? null,
  });
  const [linking, setLinking] = useState<number | null>(null);
  const foodList = useQuery({ queryKey: ['foods', ''], queryFn: () => api.foods.search('', 100) });
  const [pickedFoods, setPickedFoods] = useState<Food[]>([]);
  const foodsById = useMemo(
    () => new Map([...(foodList.data ?? []), ...pickedFoods].map((f) => [f.id, f])),
    [foodList.data, pickedFoods],
  );

  const servings = Number(draft.servings.replace(',', '.'));
  const nutrition = recipeNutrition(
    draft.ingredients.map((i) => ({
      per100g: i.foodId ? (foodsById.get(i.foodId)?.per100g ?? null) : null,
      grams: i.grams,
    })),
    servings > 0 ? servings : 1,
  );

  const done = async () => {
    await queryClient.invalidateQueries({ queryKey: ['recipes'] });
    await queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    await navigate({ to: '/nutrition' });
  };
  const save = useMutation({ mutationFn: api.recipes.save, onSuccess: done });
  const remove = useMutation({ mutationFn: api.recipes.remove, onSuccess: done });

  const setIngredient = (index: number, patch: Partial<Ingredient>) =>
    setDraft((d) => ({
      ...d,
      ingredients: d.ingredients.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)),
    }));

  return (
    <Page title={isNew ? 'New recipe' : draft.name || 'Recipe'}>
      <TextField
        label="Name"
        value={draft.name}
        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
      />
      <div className="vt-row">
        <TextField
          label="Servings"
          inputMode="decimal"
          value={draft.servings}
          onChange={(e) => setDraft((d) => ({ ...d, servings: e.target.value }))}
        />
        <TextField
          label="Tags"
          placeholder="e.g. dinner, meal prep"
          value={draft.tags}
          onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
        />
      </div>

      <Section label="Per serving">
        <div className="vt-preview" aria-label="Nutrition per serving">
          <div>
            <strong>{formatNumber(nutrition.perServing.kcal, 0)}</strong>
            <span>kcal</span>
          </div>
          <div>
            <strong>{formatNumber(nutrition.perServing.protein)}</strong>
            <span>protein</span>
          </div>
          <div>
            <strong>{formatNumber(nutrition.perServing.carbs)}</strong>
            <span>carbs</span>
          </div>
          <div>
            <strong>{formatNumber(nutrition.perServing.fat)}</strong>
            <span>fat</span>
          </div>
        </div>
        {!nutrition.complete && draft.ingredients.length > 0 && (
          <p className="vt-muted" style={{ margin: 0 }}>
            Some ingredients aren&apos;t linked to a food or have no amount in grams. They are left
            out of the nutrition and the shopping list.
          </p>
        )}
      </Section>

      <Section label="Ingredients">
        {draft.ingredients.map((ingredient, index) => {
          const food = ingredient.foodId ? foodsById.get(ingredient.foodId) : undefined;
          return (
            <div key={index} className="vt-ingredient">
              <TextField
                label={`Ingredient ${index + 1}`}
                value={ingredient.text}
                onChange={(e) => setIngredient(index, { text: e.target.value })}
              />
              <TextField
                label="Amount"
                inputMode="decimal"
                suffix="g"
                value={ingredient.grams ?? ''}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(',', '.'));
                  setIngredient(index, {
                    grams: e.target.value === '' || !(n > 0) ? null : n,
                  });
                }}
              />
              <Button
                variant={food ? 'secondary' : 'ghost'}
                className="vt-ingredient__link"
                onClick={() => setLinking(index)}
                aria-label={
                  food ? `Linked to ${food.name}. Change` : `Link ingredient ${index + 1} to a food`
                }
              >
                <Link2 aria-hidden="true" size={16} />
                {food ? food.name : 'Link food'}
              </Button>
              <button
                type="button"
                className="vt-icon-button"
                aria-label={`Remove ingredient ${index + 1}`}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    ingredients: d.ingredients.filter((_, i) => i !== index),
                  }))
                }
              >
                <Trash2 aria-hidden="true" size={18} />
              </button>
            </div>
          );
        })}
        <Button
          variant="ghost"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              ingredients: [...d.ingredients, { foodId: null, text: '', grams: null }],
            }))
          }
        >
          <Plus aria-hidden="true" size={18} /> Add ingredient
        </Button>
      </Section>

      <div className="vt-field">
        <label className="vt-field__label" htmlFor="recipe-instructions">
          Instructions
        </label>
        <textarea
          id="recipe-instructions"
          className="vt-input"
          rows={8}
          value={draft.instructions}
          onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))}
        />
      </div>
      {draft.sourceUrl && (
        <p className="vt-muted" style={{ margin: 0 }}>
          Source:{' '}
          <a className="vt-accent" href={draft.sourceUrl} target="_blank" rel="noreferrer">
            {new URL(draft.sourceUrl).hostname}
          </a>
        </p>
      )}

      <ErrorMessage error={save.error ?? remove.error} />
      <div className="vt-row">
        {!isNew && (
          <Button
            variant="danger"
            busy={remove.isPending}
            onClick={() => {
              if (window.confirm('Delete this recipe? It is also removed from the meal plan.')) {
                remove.mutate(draft.id);
              }
            }}
          >
            Delete
          </Button>
        )}
        <Button
          busy={save.isPending}
          disabled={!draft.name.trim() || !(servings > 0)}
          onClick={() =>
            save.mutate({
              id: draft.id,
              name: draft.name.trim(),
              servings,
              ingredients: draft.ingredients
                .filter((i) => i.text.trim())
                .map((i) => ({ ...i, text: i.text.trim() })),
              instructions: draft.instructions.trim(),
              tags: draft.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
              sourceUrl: draft.sourceUrl,
            })
          }
        >
          Save recipe
        </Button>
      </div>

      {linking != null && (
        <Sheet open title="Link to a food" onClose={() => setLinking(null)}>
          <SearchFoods
            onPick={(food) => {
              setPickedFoods((f) => [...f, food]);
              const current = draft.ingredients[linking];
              setIngredient(linking, {
                foodId: food.id,
                text: current?.text.trim() ? current.text : food.name,
              });
              setLinking(null);
            }}
          />
        </Sheet>
      )}
    </Page>
  );
}
