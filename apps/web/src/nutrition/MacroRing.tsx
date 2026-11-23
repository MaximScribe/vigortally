import type { Nutrients, Profile } from '@vigortally/schema';
import { formatNumber } from '../lib/format';

interface Props {
  totals: Nutrients;
  targets: Profile['targets'];
}

const macros = [
  { key: 'protein', label: 'Protein', kcalPerGram: 4 },
  { key: 'carbs', label: 'Carbs', kcalPerGram: 4 },
  { key: 'fat', label: 'Fat', kcalPerGram: 9 },
] as const;

const SIZE = 180;
const STROKE = 16;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;
/** Surface-coloured gap between segments, in px along the ring. */
const GAP = 3;

/**
 * Donut of where today's calories came from (protein / carbs / fat by energy), with
 * calories eaten in the middle and a labelled progress bar per macro underneath.
 * Colour is never the only cue: every macro is named with its grams.
 */
export function MacroRing({ totals, targets }: Props) {
  const energy = macros.map((m) => totals[m.key] * m.kcalPerGram);
  const total = energy.reduce((a, b) => a + b, 0);
  const remaining = targets.kcal - totals.kcal;

  const shares = energy.map((e) => (total > 0 ? e / total : 0));
  const segments = macros.map((m, i) => {
    const share = shares[i]!;
    const length = share * CIRCUMFERENCE;
    // Each segment starts where the previous ones end.
    const offset = shares.slice(0, i).reduce((sum, s) => sum + s * CIRCUMFERENCE, 0);
    const visible = Math.max(0, length - (share < 1 ? GAP : 0));
    return { ...m, share, visible, offset };
  });

  return (
    <div className="vt-macros">
      <figure className="vt-ring" aria-label="Calories and macros today">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img">
          <title>
            {`${Math.round(totals.kcal)} of ${targets.kcal} kcal. ` +
              segments.map((s) => `${s.label} ${Math.round(s.share * 100)}% of energy`).join(', ')}
          </title>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="var(--vt-color-surface-raised)"
            strokeWidth={STROKE}
          />
          {total > 0 &&
            segments.map((s) =>
              s.visible > 0 ? (
                <circle
                  key={s.key}
                  className="vt-ring__segment"
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  stroke={`var(--vt-color-macro-${s.key})`}
                  strokeWidth={STROKE}
                  strokeDasharray={`${s.visible} ${CIRCUMFERENCE - s.visible}`}
                  strokeDashoffset={-s.offset}
                  transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                >
                  <title>{`${s.label}: ${formatNumber(totals[s.key])} g · ${Math.round(s.share * 100)}% of energy`}</title>
                </circle>
              ) : null,
            )}
        </svg>
        <figcaption className="vt-ring__center">
          <span className="vt-ring__value">{formatNumber(totals.kcal, 0)}</span>
          <span className="vt-ring__unit">of {formatNumber(targets.kcal, 0)} kcal</span>
          <span className={`vt-ring__left ${remaining < 0 ? 'vt-ring__left--over' : ''}`}>
            {remaining >= 0
              ? `${formatNumber(remaining, 0)} left`
              : `${formatNumber(-remaining, 0)} over`}
          </span>
        </figcaption>
      </figure>

      <ul className="vt-macro-bars">
        {macros.map((m) => {
          const value = totals[m.key];
          const target = targets[m.key];
          const pct = target > 0 ? Math.min(1, value / target) : 0;
          return (
            <li key={m.key} className="vt-macro-bar">
              <div className="vt-macro-bar__label">
                <span className="vt-macro-bar__swatch" data-macro={m.key} aria-hidden="true" />
                <span>{m.label}</span>
                <span className="vt-macro-bar__value">
                  {formatNumber(value, 0)} / {formatNumber(target, 0)} g
                </span>
              </div>
              <div
                className="vt-macro-bar__track"
                role="progressbar"
                aria-label={m.label}
                aria-valuemin={0}
                aria-valuemax={target}
                aria-valuenow={Math.round(value)}
              >
                <div
                  className="vt-macro-bar__fill"
                  data-macro={m.key}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
