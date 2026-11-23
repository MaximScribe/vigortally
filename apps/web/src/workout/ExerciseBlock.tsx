import { displayWeight, exerciseDisplayName, inputWeightToKg, setLabels } from '@vigortally/core';
import type { Exercise, UnitSystem, WorkoutExercise, WorkoutSet } from '@vigortally/schema';
import { Check, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { formatNumber } from '../lib/format';
import {
  emptySet,
  nextSetType,
  updateExercise,
  updateSet,
  updateWorkout,
  type ActiveWorkout,
} from './activeWorkout';

interface Props {
  index: number;
  entry: WorkoutExercise;
  exercise: Exercise | undefined;
  previous: WorkoutSet[] | undefined;
  units: UnitSystem;
  /** Template editing hides the PREVIOUS column and the check buttons. */
  mode?: 'log' | 'template';
  onChange?: (update: (entry: WorkoutExercise) => WorkoutExercise) => void;
  onRemove?: () => void;
}

const typeNames = { normal: 'Normal set', warmup: 'Warm-up', drop: 'Drop set', failure: 'Failure' };

function formatPrevious(set: WorkoutSet | undefined, units: UnitSystem): string {
  if (!set || set.reps == null) return '—';
  if (set.weightKg == null || set.weightKg === 0) return `${set.reps} reps`;
  const w = displayWeight(set.weightKg, units);
  return `${formatNumber(w.value, 2)} ${w.unit} × ${set.reps}`;
}

function toDisplay(kg: number | null, units: UnitSystem): string {
  return kg == null ? '' : String(displayWeight(kg, units).value);
}

/** One exercise in the logger: title, set table and ADD SET. */
export function ExerciseBlock({
  index,
  entry,
  exercise,
  previous,
  units,
  mode = 'log',
  onChange,
  onRemove,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const labels = setLabels(entry.sets);
  const unit = units === 'imperial' ? 'LB' : 'KG';
  const change = onChange ?? ((update) => updateExercise(index, update));
  const changeSet = (setIndex: number, patch: Partial<WorkoutSet>) =>
    onChange
      ? change((e) => ({
          ...e,
          sets: e.sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s)),
        }))
      : updateSet(index, setIndex, patch);
  const name = exercise ? exerciseDisplayName(exercise) : 'Unknown exercise';

  function toggleDone(setIndex: number) {
    const set = entry.sets[setIndex]!;
    if (set.done) return changeSet(setIndex, { done: false });
    // Like a paper log: checking an empty set takes last time's numbers.
    const prev = previous?.[setIndex];
    changeSet(setIndex, {
      done: true,
      weightKg: set.weightKg ?? prev?.weightKg ?? null,
      reps: set.reps ?? prev?.reps ?? null,
    });
    updateWorkout((w: ActiveWorkout) => ({
      ...w,
      restEndsAt: w.restSeconds > 0 ? Date.now() + w.restSeconds * 1000 : null,
    }));
  }

  return (
    <section className="vt-exercise" aria-label={name}>
      <div className="vt-exercise__header">
        <h2 className="vt-exercise__title">{name}</h2>
        <div className="vt-exercise__menu">
          <button
            type="button"
            className="vt-icon-button vt-accent"
            aria-label={`Options for ${name}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MoreVertical aria-hidden="true" size={20} />
          </button>
          {menuOpen && (
            <div className="vt-popover" role="menu">
              <button
                type="button"
                role="menuitem"
                disabled={entry.sets.length === 0}
                onClick={() => {
                  change((e) => ({ ...e, sets: e.sets.slice(0, -1) }));
                  setMenuOpen(false);
                }}
              >
                Remove last set
              </button>
              <button
                type="button"
                role="menuitem"
                className="vt-danger"
                onClick={() => {
                  setMenuOpen(false);
                  if (onRemove) onRemove();
                  else
                    updateWorkout((w) => ({
                      ...w,
                      exercises: w.exercises.filter((_, i) => i !== index),
                    }));
                }}
              >
                Remove exercise
              </button>
            </div>
          )}
        </div>
      </div>

      <table className={`vt-sets ${mode === 'template' ? 'vt-sets--template' : ''}`}>
        <colgroup>
          <col className="vt-col-set" />
          {mode === 'log' && <col />}
          <col className="vt-col-input" />
          <col className="vt-col-input" />
          {mode === 'log' && <col className="vt-col-check" />}
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Set</th>
            {mode === 'log' && <th scope="col">Previous</th>}
            <th scope="col">{unit}</th>
            <th scope="col">Reps</th>
            {mode === 'log' && (
              <th scope="col">
                <span className="vt-sr-only">Done</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {entry.sets.map((set, setIndex) => {
            const prev = previous?.[setIndex];
            const prevDisplay = prev?.weightKg != null ? toDisplay(prev.weightKg, units) : '';
            return (
              <tr key={setIndex} className={set.done ? 'vt-sets__row--done' : undefined}>
                <td>
                  <button
                    type="button"
                    className={`vt-set-label vt-set-label--${set.type}`}
                    onClick={() => changeSet(setIndex, { type: nextSetType(set.type) })}
                    aria-label={`Set ${labels[setIndex]}, ${typeNames[set.type]}. Change type`}
                  >
                    {labels[setIndex]}
                  </button>
                </td>
                {mode === 'log' && (
                  <td className="vt-sets__previous">{formatPrevious(prev, units)}</td>
                )}
                <td>
                  <input
                    className="vt-set-input"
                    inputMode="decimal"
                    aria-label={`Set ${labels[setIndex]} ${unit.toLowerCase()}`}
                    placeholder={prevDisplay}
                    value={toDisplay(set.weightKg, units)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(',', '.');
                      const n = Number(raw);
                      if (raw === '') changeSet(setIndex, { weightKg: null });
                      else if (Number.isFinite(n) && n >= 0)
                        changeSet(setIndex, {
                          weightKg: Math.round(inputWeightToKg(n, units) * 1000) / 1000,
                        });
                    }}
                  />
                </td>
                <td>
                  <input
                    className="vt-set-input"
                    inputMode="numeric"
                    aria-label={`Set ${labels[setIndex]} reps`}
                    placeholder={prev?.reps != null ? String(prev.reps) : ''}
                    value={set.reps ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const n = Number.parseInt(raw, 10);
                      if (raw === '') changeSet(setIndex, { reps: null });
                      else if (Number.isFinite(n) && n >= 0) changeSet(setIndex, { reps: n });
                    }}
                  />
                </td>
                {mode === 'log' && (
                  <td>
                    <button
                      type="button"
                      className="vt-set-check"
                      aria-pressed={set.done}
                      aria-label={`Complete set ${labels[setIndex]}`}
                      onClick={() => toggleDone(setIndex)}
                    >
                      <Check aria-hidden="true" size={20} />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <button
        type="button"
        className="vt-button vt-button--ghost vt-exercise__add"
        onClick={() =>
          change((e) => {
            const last = e.sets.at(-1);
            // New sets copy the previous set's numbers but start unchecked.
            return {
              ...e,
              sets: [...e.sets, last ? { ...last, type: 'normal', done: false } : emptySet()],
            };
          })
        }
      >
        Add set
      </button>
    </section>
  );
}
