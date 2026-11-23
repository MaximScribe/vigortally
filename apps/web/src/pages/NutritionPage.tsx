import { addDays, displayWeight, inputWeightToKg, today } from '@vigortally/core';
import { meals, type DayNutrition, type Meal } from '@vigortally/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../api/ApiProvider';
import { useMe } from '../auth/AuthGate';
import { Button, ErrorMessage } from '../components/forms';
import { Page, Section } from '../components/Page';
import { formatDay, formatNumber } from '../lib/format';
import { newId } from '../lib/ids';
import { AddFoodSheet, mealLabels } from '../nutrition/AddFoodSheet';
import { MacroRing } from '../nutrition/MacroRing';
import '../components/list.css';
import '../nutrition/nutrition.css';

export function NutritionPage() {
  const api = useApi();
  const me = useMe();
  const [date, setDate] = useState(() => today());
  const [adding, setAdding] = useState<Meal | null>(null);
  const day = useQuery({ queryKey: ['diary', date], queryFn: () => api.diary.day(date) });
  const targets = me.profile.targets;
  const empty: DayNutrition = {
    date,
    entries: [],
    totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    waterMl: 0,
    weighIn: null,
  };
  const data = day.data ?? empty;

  return (
    <Page title="Nutrition">
      <div className="vt-daynav">
        <button
          type="button"
          className="vt-icon-button"
          aria-label="Previous day"
          onClick={() => setDate((d) => addDays(d, -1))}
        >
          <ChevronLeft aria-hidden="true" size={22} />
        </button>
        <span className="vt-daynav__label">{formatDay(date)}</span>
        <button
          type="button"
          className="vt-icon-button"
          aria-label="Next day"
          onClick={() => setDate((d) => addDays(d, 1))}
        >
          <ChevronRight aria-hidden="true" size={22} />
        </button>
      </div>

      <div className="vt-card">
        <MacroRing totals={data.totals} targets={targets} />
      </div>

      <div className="vt-stat-cards">
        <WaterCard date={date} ml={data.waterMl} targetMl={targets.waterMl} />
        <WeightCard date={date} day={data} />
      </div>

      {meals.map((meal) => {
        const entries = data.entries.filter((e) => e.meal === meal);
        const kcal = entries.reduce((sum, e) => sum + e.nutrients.kcal, 0);
        return (
          <Section
            key={meal}
            label={mealLabels[meal]}
            action={
              <span className="vt-meal__kcal">
                {entries.length > 0 && `${formatNumber(kcal, 0)} kcal`}
                <button
                  type="button"
                  className="vt-icon-button"
                  aria-label={`Add to ${mealLabels[meal].toLowerCase()}`}
                  onClick={() => setAdding(meal)}
                >
                  <Plus aria-hidden="true" size={22} />
                </button>
              </span>
            }
          >
            {entries.length > 0 && <EntryList date={date} entries={entries} />}
          </Section>
        );
      })}
      <ErrorMessage error={day.error} />

      {adding && <AddFoodSheet date={date} meal={adding} onClose={() => setAdding(null)} />}
    </Page>
  );
}

function EntryList({ date, entries }: { date: string; entries: DayNutrition['entries'] }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: api.diary.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['diary', date] }),
  });
  return (
    <ul className="vt-list">
      {entries.map((entry) => (
        <li key={entry.id} className="vt-list__item">
          <span className="vt-list__main">
            <span>{entry.name}</span>
            <span className="vt-list__sub">
              {[
                entry.servings != null
                  ? `${formatNumber(entry.servings)} ${entry.servings === 1 ? 'serving' : 'servings'}`
                  : entry.grams != null
                    ? `${formatNumber(entry.grams, 0)} g`
                    : null,
                `P ${formatNumber(entry.nutrients.protein, 0)} · C ${formatNumber(entry.nutrients.carbs, 0)} · F ${formatNumber(entry.nutrients.fat, 0)}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
          <span className="vt-list__value">{formatNumber(entry.nutrients.kcal, 0)} kcal</span>
          <button
            type="button"
            className="vt-icon-button"
            aria-label={`Remove ${entry.name}`}
            onClick={() => remove.mutate(entry.id)}
          >
            <Trash2 aria-hidden="true" size={18} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function WaterCard({ date, ml, targetMl }: { date: string; ml: number; targetMl: number }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const add = useMutation({
    mutationFn: (delta: number) => api.diary.addWater({ id: newId(), date, ml: delta }),
    onSuccess: (day) => queryClient.setQueryData(['diary', date], day),
  });
  return (
    <div className="vt-card vt-stat-card">
      <span className="vt-label">Water</span>
      <span className="vt-stat-card__value" aria-live="polite">
        {formatNumber(ml / 1000, 2)}{' '}
        <small className="vt-muted">/ {formatNumber(targetMl / 1000, 1)} l</small>
      </span>
      <div className="vt-stat-card__actions">
        <Button variant="secondary" onClick={() => add.mutate(250)} disabled={add.isPending}>
          +250
        </Button>
        <Button variant="secondary" onClick={() => add.mutate(500)} disabled={add.isPending}>
          +500
        </Button>
        <Button
          variant="ghost"
          aria-label="Remove 250 ml"
          onClick={() => add.mutate(-250)}
          disabled={add.isPending || ml <= 0}
        >
          −
        </Button>
      </div>
    </div>
  );
}

function WeightCard({ date, day }: { date: string; day: DayNutrition }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const units = useMe().profile.units;
  const [value, setValue] = useState('');
  const save = useMutation({
    mutationFn: api.weighIns.save,
    onSuccess: async () => {
      setValue('');
      await queryClient.invalidateQueries({ queryKey: ['diary', date] });
      await queryClient.invalidateQueries({ queryKey: ['weigh-ins'] });
    },
  });
  const current = day.weighIn ? displayWeight(day.weighIn.weightKg, units) : null;
  const unit = units === 'imperial' ? 'lb' : 'kg';

  return (
    <form
      className="vt-card vt-stat-card"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(value.replace(',', '.'));
        if (Number.isFinite(n) && n > 0) {
          save.mutate({
            id: day.weighIn?.id ?? newId(),
            date,
            weightKg: inputWeightToKg(n, units),
          });
        }
      }}
    >
      <span className="vt-label">Weight</span>
      <span className="vt-stat-card__value">
        {current ? `${formatNumber(current.value)} ${current.unit}` : '—'}
      </span>
      <div className="vt-stat-card__actions">
        <input
          className="vt-input"
          inputMode="decimal"
          aria-label={`Weight in ${unit}`}
          placeholder={unit}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ flex: 1, minWidth: 0 }}
        />
        <Button type="submit" variant="secondary" busy={save.isPending} disabled={!value}>
          Log
        </Button>
      </div>
      <ErrorMessage error={save.error} />
    </form>
  );
}
