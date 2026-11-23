import { addDays, today as todayIso } from '@vigortally/core';
import { meals, type Meal, type MealPlanEntry, type Recipe } from '@vigortally/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChefHat, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../api/ApiProvider';
import { Button, ErrorMessage, SelectField, TextField } from '../components/forms';
import { Sheet } from '../components/Sheet';
import { formatDay, formatNumber } from '../lib/format';
import { newId } from '../lib/ids';
import { mealLabels } from '../nutrition/AddFoodSheet';
import { setPendingImport } from './pendingImport';
import { ShoppingTab } from './ShoppingTab';
import '../components/list.css';
import './kitchen.css';

type Tab = 'today' | 'plan' | 'recipes' | 'shopping';
const tabs: { value: Tab; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'plan', label: 'Plan' },
  { value: 'recipes', label: 'Recipes' },
  { value: 'shopping', label: 'Shopping' },
];

const PLAN_DAYS = 7;

/** Pull-down panel at the top of the Nutrition tab: what to cook, recipes, shopping. */
export function KitchenPanel() {
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('today');
  const today = todayIso();
  const plan = useQuery({
    queryKey: ['meal-plan', today],
    queryFn: () => api.mealPlan.list(today, addDays(today, PLAN_DAYS - 1)),
  });
  const shopping = useQuery({
    queryKey: ['shopping-list', today],
    queryFn: () => api.shopping.list(today),
  });
  const tonight = plan.data?.filter((e) => e.date === today) ?? [];
  const days = shopping.data?.daysUntilShopping;

  const summary = [
    tonight.length > 0
      ? `Today: ${tonight.map((e) => e.recipeName).join(', ')}`
      : 'Nothing planned today',
    days == null
      ? null
      : days === 0
        ? 'shop today'
        : `shop in ${days} ${days === 1 ? 'day' : 'days'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className={`vt-card vt-kitchen ${open ? 'vt-kitchen--open' : ''}`}>
      <button
        type="button"
        className="vt-kitchen__toggle"
        aria-expanded={open}
        aria-controls="kitchen-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <ChefHat aria-hidden="true" size={22} className="vt-accent" />
        <span className="vt-list__main">
          <span className="vt-kitchen__title">Kitchen</span>
          <span className="vt-list__sub">{summary}</span>
        </span>
        <ChevronDown aria-hidden="true" size={20} className="vt-kitchen__chevron" />
      </button>

      {open && (
        <div id="kitchen-panel" className="vt-kitchen__body">
          <div className="vt-tabs" role="tablist" aria-label="Kitchen">
            {tabs.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'today' && <TodayTab entries={tonight} />}
          {tab === 'plan' && <PlanTab entries={plan.data ?? []} />}
          {tab === 'recipes' && <RecipesTab />}
          {tab === 'shopping' && <ShoppingTab />}
          <ErrorMessage error={plan.error ?? shopping.error} />
        </div>
      )}
    </section>
  );
}

function useInvalidateKitchen() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['meal-plan'] }),
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] }),
      queryClient.invalidateQueries({ queryKey: ['diary'] }),
      queryClient.invalidateQueries({ queryKey: ['recipes'] }),
    ]);
}

function TodayTab({ entries }: { entries: MealPlanEntry[] }) {
  const api = useApi();
  const invalidate = useInvalidateKitchen();
  const log = useMutation({
    mutationFn: (entry: MealPlanEntry) =>
      api.diary.save({
        id: newId(),
        date: entry.date,
        meal: entry.meal,
        recipeId: entry.recipeId,
        quantity: { servings: 1 },
      }),
    onSuccess: invalidate,
  });

  if (entries.length === 0) {
    return <p className="vt-muted">Nothing scheduled for today. Plan meals in the Plan tab.</p>;
  }
  return (
    <ul className="vt-list">
      {entries.map((entry) => (
        <li key={entry.id} className="vt-list__item">
          <span className="vt-list__main">
            <Link
              to="/kitchen/recipes/$recipeId"
              params={{ recipeId: entry.recipeId }}
              className="vt-accent"
            >
              {entry.recipeName}
            </Link>
            <span className="vt-list__sub">
              {mealLabels[entry.meal]} · cook {formatNumber(entry.servings)} servings
            </span>
          </span>
          <Button variant="secondary" busy={log.isPending} onClick={() => log.mutate(entry)}>
            Log 1 serving
          </Button>
        </li>
      ))}
      <ErrorMessage error={log.error} />
    </ul>
  );
}

function PlanTab({ entries }: { entries: MealPlanEntry[] }) {
  const api = useApi();
  const invalidate = useInvalidateKitchen();
  const [adding, setAdding] = useState<string | null>(null);
  const remove = useMutation({ mutationFn: api.mealPlan.remove, onSuccess: invalidate });
  const today = todayIso();
  const days = Array.from({ length: PLAN_DAYS }, (_, i) => addDays(today, i));

  return (
    <div className="vt-plan">
      {days.map((day) => {
        const dayEntries = entries.filter((e) => e.date === day);
        return (
          <div key={day} className="vt-plan__day">
            <div className="vt-plan__header">
              <span className="vt-label">{formatDay(day)}</span>
              <button
                type="button"
                className="vt-icon-button"
                aria-label={`Plan a meal for ${formatDay(day)}`}
                onClick={() => setAdding(day)}
              >
                <Plus aria-hidden="true" size={20} />
              </button>
            </div>
            {dayEntries.map((entry) => (
              <div key={entry.id} className="vt-plan__entry">
                <span>
                  {entry.recipeName}{' '}
                  <span className="vt-muted">
                    · {mealLabels[entry.meal]} · {formatNumber(entry.servings)}×
                  </span>
                </span>
                <button
                  type="button"
                  className="vt-icon-button"
                  aria-label={`Remove ${entry.recipeName} from ${formatDay(day)}`}
                  onClick={() => remove.mutate(entry.id)}
                >
                  <Trash2 aria-hidden="true" size={16} />
                </button>
              </div>
            ))}
          </div>
        );
      })}
      {adding && <PlanMealSheet date={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}

function PlanMealSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const api = useApi();
  const invalidate = useInvalidateKitchen();
  const recipes = useQuery({ queryKey: ['recipes'], queryFn: api.recipes.list });
  const [recipeId, setRecipeId] = useState('');
  const [meal, setMeal] = useState<Meal>('dinner');
  const [servings, setServings] = useState('');
  const [repeatWeeks, setRepeatWeeks] = useState('1');
  const recipe = recipes.data?.find((r) => r.id === recipeId);

  const save = useMutation({
    mutationFn: async () => {
      const weeks = Math.max(1, Math.min(12, Number(repeatWeeks) || 1));
      for (let w = 0; w < weeks; w++) {
        await api.mealPlan.save({
          id: newId(),
          date: addDays(date, w * 7),
          meal,
          recipeId,
          servings: Number(servings) || recipe?.servings || 1,
        });
      }
    },
    onSuccess: async () => {
      await invalidate();
      onClose();
    },
  });

  return (
    <Sheet open title={`Plan for ${formatDay(date)}`} onClose={onClose}>
      {recipes.data?.length === 0 ? (
        <p className="vt-muted">Add a recipe first in the Recipes tab.</p>
      ) : (
        <>
          <SelectField
            label="Recipe"
            value={recipeId}
            onChange={(e) => setRecipeId(e.target.value)}
            options={[
              { value: '', label: 'Choose a recipe' },
              ...(recipes.data ?? []).map((r: Recipe) => ({ value: r.id, label: r.name })),
            ]}
          />
          <div className="vt-row">
            <SelectField
              label="Meal"
              value={meal}
              onChange={(e) => setMeal(e.target.value as Meal)}
              options={meals.map((m) => ({ value: m, label: mealLabels[m] }))}
            />
            <TextField
              label="Servings to cook"
              inputMode="decimal"
              placeholder={recipe ? String(recipe.servings) : ''}
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </div>
          <TextField
            label="Repeat weekly"
            inputMode="numeric"
            suffix="weeks"
            hint="Meal prep rotation: schedule the same meal on this weekday for several weeks."
            value={repeatWeeks}
            onChange={(e) => setRepeatWeeks(e.target.value.replace(/\D/g, ''))}
          />
          <ErrorMessage error={save.error ?? recipes.error} />
          <Button disabled={!recipeId} busy={save.isPending} onClick={() => save.mutate()}>
            Add to plan
          </Button>
        </>
      )}
    </Sheet>
  );
}

function RecipesTab() {
  const api = useApi();
  const navigate = useNavigate();
  const recipes = useQuery({ queryKey: ['recipes'], queryFn: api.recipes.list });
  const [url, setUrl] = useState('');
  const importRecipe = useMutation({
    mutationFn: api.recipes.import,
    onSuccess: (draft) => {
      setPendingImport(draft);
      void navigate({ to: '/kitchen/recipes/$recipeId', params: { recipeId: 'new' } });
    },
  });

  return (
    <>
      <ul className="vt-list">
        {recipes.data?.map((recipe) => (
          <li key={recipe.id}>
            <Link
              to="/kitchen/recipes/$recipeId"
              params={{ recipeId: recipe.id }}
              className="vt-list__item vt-list__item--button"
            >
              <span className="vt-list__main">
                <span>{recipe.name}</span>
                <span className="vt-list__sub">
                  {formatNumber(recipe.nutritionPerServing.kcal, 0)} kcal per serving
                  {!recipe.nutritionComplete && ' (incomplete)'}
                  {recipe.tags.length > 0 && ` · ${recipe.tags.slice(0, 3).join(', ')}`}
                </span>
              </span>
            </Link>
          </li>
        ))}
        {recipes.data?.length === 0 && <li className="vt-list__empty">No recipes yet.</li>}
      </ul>
      <Button
        variant="secondary"
        onClick={() =>
          void navigate({ to: '/kitchen/recipes/$recipeId', params: { recipeId: 'new' } })
        }
      >
        New recipe
      </Button>
      <form
        className="vt-row vt-row--end"
        onSubmit={(e) => {
          e.preventDefault();
          importRecipe.mutate(url.trim());
        }}
      >
        <TextField
          label="Import from a website"
          type="url"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button type="submit" variant="secondary" busy={importRecipe.isPending} disabled={!url}>
          Import
        </Button>
      </form>
      <ErrorMessage error={importRecipe.error ?? recipes.error} />
    </>
  );
}
