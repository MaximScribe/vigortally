import { nutrientsForGrams } from '@vigortally/core';
import type { Food, Meal, Nutrients } from '@vigortally/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useApi } from '../api/ApiProvider';
import { Button, ErrorMessage, SelectField, TextField } from '../components/forms';
import { Sheet } from '../components/Sheet';
import { formatNumber } from '../lib/format';
import { newId } from '../lib/ids';
import '../components/list.css';

export const mealLabels: Record<Meal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

type Mode = 'search' | 'barcode' | 'quick' | 'new';
const modes: { value: Mode; label: string }[] = [
  { value: 'search', label: 'Search' },
  { value: 'barcode', label: 'Barcode' },
  { value: 'quick', label: 'Quick add' },
  { value: 'new', label: 'New food' },
];

interface Props {
  date: string;
  meal: Meal;
  onClose: () => void;
}

/** Add something to a meal: search or recent foods, barcode, quick calories or a new food. */
export function AddFoodSheet({ date, meal, onClose }: Props) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('search');
  const [picked, setPicked] = useState<Food | null>(null);

  const save = useMutation({
    mutationFn: api.diary.save,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['diary', date] });
      onClose();
    },
  });

  return (
    <Sheet open title={`Add to ${mealLabels[meal].toLowerCase()}`} onClose={onClose}>
      {picked ? (
        <AmountStep
          food={picked}
          busy={save.isPending}
          onBack={() => setPicked(null)}
          onAdd={(quantity) =>
            save.mutate({ id: newId(), date, meal, foodId: picked.id, quantity })
          }
        />
      ) : (
        <>
          <div className="vt-tabs" role="tablist" aria-label="How to add">
            {modes.map((m) => (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={mode === m.value}
                onClick={() => setMode(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
          {mode === 'search' && <SearchFoods onPick={setPicked} />}
          {mode === 'barcode' && <BarcodeLookup onPick={setPicked} />}
          {mode === 'quick' && (
            <QuickAdd
              busy={save.isPending}
              onAdd={(name, nutrients) =>
                save.mutate({ id: newId(), date, meal, quickAdd: { name, nutrients } })
              }
            />
          )}
          {mode === 'new' && <FoodForm onSaved={setPicked} />}
        </>
      )}
      <ErrorMessage error={save.error} />
    </Sheet>
  );
}

function FoodList({ foods, onPick }: { foods: Food[]; onPick: (food: Food) => void }) {
  return (
    <ul className="vt-list">
      {foods.map((food) => (
        <li key={food.id}>
          <button
            type="button"
            className="vt-list__item vt-list__item--button"
            onClick={() => onPick(food)}
          >
            <span className="vt-list__main">
              <span>{food.name}</span>
              <span className="vt-list__sub">
                {[food.brand, `${formatNumber(food.per100g.kcal, 0)} kcal / 100 g`]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function SearchFoods({ onPick }: { onPick: (food: Food) => void }) {
  const api = useApi();
  const [q, setQ] = useState('');
  const query = q.trim();
  const results = useQuery({
    queryKey: ['foods', query],
    queryFn: () => (query ? api.foods.search(query) : api.foods.recent()),
    placeholderData: (previous) => previous,
  });
  return (
    <>
      <input
        className="vt-input"
        type="search"
        placeholder="Search your foods"
        aria-label="Search foods"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />
      {!query && <p className="vt-label">Recent</p>}
      {results.data && results.data.length > 0 ? (
        <FoodList foods={results.data} onPick={onPick} />
      ) : (
        results.isSuccess && (
          <p className="vt-muted">
            {query
              ? 'No food matches. Scan the barcode or create a new food.'
              : 'Foods you log show up here.'}
          </p>
        )
      )}
      <ErrorMessage error={results.error} />
    </>
  );
}

function BarcodeLookup({ onPick }: { onPick: (food: Food) => void }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const lookup = useMutation({
    mutationFn: api.foods.barcode,
    onSuccess: (food) => {
      void queryClient.invalidateQueries({ queryKey: ['foods'] });
      onPick(food);
    },
  });
  return (
    <form
      className="vt-form"
      onSubmit={(e) => {
        e.preventDefault();
        lookup.mutate(code.trim());
      }}
    >
      <TextField
        label="Barcode"
        inputMode="numeric"
        pattern="\d{6,14}"
        placeholder="e.g. 4000000000001"
        hint="Use the companion app to scan with the camera. Products come from Open Food Facts."
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        autoFocus
      />
      <ErrorMessage error={lookup.error} />
      <Button type="submit" busy={lookup.isPending} disabled={code.length < 6}>
        Look up
      </Button>
    </form>
  );
}

const num = (value: string) => {
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

function QuickAdd({
  busy,
  onAdd,
}: {
  busy: boolean;
  onAdd: (name: string, nutrients: Nutrients) => void;
}) {
  const [form, setForm] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <>
      <TextField label="Name" placeholder="e.g. Coffee" value={form.name} onChange={set('name')} />
      <TextField
        label="Calories"
        inputMode="decimal"
        suffix="kcal"
        value={form.kcal}
        onChange={set('kcal')}
      />
      <div className="vt-row">
        <TextField
          label="Protein"
          inputMode="decimal"
          suffix="g"
          value={form.protein}
          onChange={set('protein')}
        />
        <TextField
          label="Carbs"
          inputMode="decimal"
          suffix="g"
          value={form.carbs}
          onChange={set('carbs')}
        />
        <TextField
          label="Fat"
          inputMode="decimal"
          suffix="g"
          value={form.fat}
          onChange={set('fat')}
        />
      </div>
      <Button
        busy={busy}
        disabled={!form.kcal}
        onClick={() =>
          onAdd(form.name.trim() || 'Quick add', {
            kcal: num(form.kcal),
            protein: num(form.protein),
            carbs: num(form.carbs),
            fat: num(form.fat),
          })
        }
      >
        Add
      </Button>
    </>
  );
}

/** Create a food (nutrients per 100 g, optional serving). */
export function FoodForm({ onSaved, initial }: { onSaved: (food: Food) => void; initial?: Food }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    brand: initial?.brand ?? '',
    kcal: initial ? String(initial.per100g.kcal) : '',
    protein: initial ? String(initial.per100g.protein) : '',
    carbs: initial ? String(initial.per100g.carbs) : '',
    fat: initial ? String(initial.per100g.fat) : '',
    servingLabel: initial?.servings[0]?.label ?? '',
    servingGrams: initial?.servings[0] ? String(initial.servings[0].grams) : '',
  });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const save = useMutation({
    mutationFn: api.foods.save,
    onSuccess: (food) => {
      void queryClient.invalidateQueries({ queryKey: ['foods'] });
      onSaved(food);
    },
  });
  const servingGrams = num(form.servingGrams);

  return (
    <>
      <TextField label="Food name" value={form.name} onChange={set('name')} />
      <TextField label="Brand" placeholder="optional" value={form.brand} onChange={set('brand')} />
      <p className="vt-label">Per 100 g</p>
      <TextField
        label="Calories"
        inputMode="decimal"
        suffix="kcal"
        value={form.kcal}
        onChange={set('kcal')}
      />
      <div className="vt-row">
        <TextField
          label="Protein"
          inputMode="decimal"
          suffix="g"
          value={form.protein}
          onChange={set('protein')}
        />
        <TextField
          label="Carbs"
          inputMode="decimal"
          suffix="g"
          value={form.carbs}
          onChange={set('carbs')}
        />
        <TextField
          label="Fat"
          inputMode="decimal"
          suffix="g"
          value={form.fat}
          onChange={set('fat')}
        />
      </div>
      <div className="vt-row">
        <TextField
          label="Serving"
          placeholder="e.g. 1 slice"
          value={form.servingLabel}
          onChange={set('servingLabel')}
        />
        <TextField
          label="Serving size"
          inputMode="decimal"
          suffix="g"
          value={form.servingGrams}
          onChange={set('servingGrams')}
        />
      </div>
      <ErrorMessage error={save.error} />
      <Button
        busy={save.isPending}
        disabled={!form.name.trim() || !form.kcal}
        onClick={() =>
          save.mutate({
            id: initial?.id ?? newId(),
            name: form.name.trim(),
            brand: form.brand.trim() || null,
            barcode: initial?.barcode ?? null,
            source: initial?.source ?? 'custom',
            per100g: {
              kcal: num(form.kcal),
              protein: num(form.protein),
              carbs: num(form.carbs),
              fat: num(form.fat),
            },
            servings:
              servingGrams > 0
                ? [{ label: form.servingLabel.trim() || `${servingGrams} g`, grams: servingGrams }]
                : [],
          })
        }
      >
        Save food
      </Button>
    </>
  );
}

function AmountStep({
  food,
  busy,
  onBack,
  onAdd,
}: {
  food: Food;
  busy: boolean;
  onBack: () => void;
  onAdd: (quantity: { grams: number } | { servings: number }) => void;
}) {
  const serving = food.servings[0];
  const [unit, setUnit] = useState<'serving' | 'grams'>(serving ? 'serving' : 'grams');
  const [amount, setAmount] = useState(serving ? '1' : '100');
  const value = num(amount);
  const grams = unit === 'serving' && serving ? value * serving.grams : value;
  const preview = nutrientsForGrams(food.per100g, grams);

  return (
    <>
      <div>
        <p className="vt-title" style={{ margin: 0 }}>
          {food.name}
        </p>
        {food.brand && (
          <p className="vt-muted" style={{ margin: 0 }}>
            {food.brand}
          </p>
        )}
      </div>
      <div className="vt-row">
        <TextField
          label="Amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
        <SelectField
          label="Unit"
          value={unit}
          onChange={(e) => {
            const next = e.target.value as 'serving' | 'grams';
            setUnit(next);
            setAmount(next === 'serving' ? '1' : String(serving?.grams ?? 100));
          }}
          options={[
            ...(serving ? [{ value: 'serving', label: serving.label }] : []),
            { value: 'grams', label: 'grams' },
          ]}
        />
      </div>
      <div className="vt-preview" aria-label="Nutrition for this amount">
        <div>
          <strong>{formatNumber(preview.kcal, 0)}</strong>
          <span>kcal</span>
        </div>
        <div>
          <strong>{formatNumber(preview.protein)}</strong>
          <span>protein</span>
        </div>
        <div>
          <strong>{formatNumber(preview.carbs)}</strong>
          <span>carbs</span>
        </div>
        <div>
          <strong>{formatNumber(preview.fat)}</strong>
          <span>fat</span>
        </div>
      </div>
      <div className="vt-row">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button
          busy={busy}
          disabled={value <= 0}
          onClick={() =>
            onAdd(unit === 'serving' && serving ? { servings: value } : { grams: value })
          }
        >
          Add
        </Button>
      </div>
    </>
  );
}
