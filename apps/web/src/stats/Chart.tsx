import type { Bucket, Series } from '@vigortally/schema';
import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '../lib/format';

interface Props {
  series: Series;
  type: 'line' | 'bar';
  bucket: Bucket;
  /** Accessible name of the chart, e.g. the widget title. */
  title: string;
}

const HEIGHT = 180;
const PAD = { top: 12, right: 8, bottom: 24, left: 40 };

const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit' });

export function formatBucket(date: string, bucket: Bucket): string {
  const d = new Date(`${date}T12:00:00`);
  if (bucket === 'month') return monthFormat.format(d);
  return bucket === 'week' ? `Week of ${dayFormat.format(d)}` : dayFormat.format(d);
}

function shortLabel(date: string, bucket: Bucket): string {
  const d = new Date(`${date}T12:00:00`);
  return bucket === 'month' ? monthFormat.format(d) : dayFormat.format(d);
}

/** Rounded, human tick values covering [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const rough = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough)!;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  // Keep adding ticks until the top one is at or above the largest value, so no mark
  // can ever poke out above the plot area.
  for (let v = start; ; v += step) {
    ticks.push(Math.round(v * 1e6) / 1e6);
    if (v >= max - 1e-9) break;
  }
  return ticks;
}

function useWidth(fallback = 320) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(160, Math.round(entry.contentRect.width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Single-series line or bar chart. One series, so no legend: the widget title names it.
 * Hovering (or touching) shows the value; the data is also available as a table.
 */
export function Chart({ series, type, bucket, title }: Props) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const points = series.points;

  const values = points.map((p) => p.value);
  // Bars start at zero; lines (e.g. weight) zoom in on their range.
  const lo = type === 'bar' ? 0 : Math.min(...values);
  const hi = Math.max(...values, type === 'bar' ? 0 : -Infinity);
  const ticks = niceTicks(lo, hi);
  const yMin = ticks[0]!;
  const yMax = ticks[ticks.length - 1]!;
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;
  const step = innerW / Math.max(points.length, 1);
  const x = (i: number) =>
    type === 'bar'
      ? PAD.left + step * i + step / 2
      : PAD.left + (points.length === 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
  const barWidth = Math.max(2, Math.min(28, step - 2));

  const labelEvery = Math.max(1, Math.ceil(points.length / Math.floor(innerW / 64)));
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join('');

  function onPointer(event: React.PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - box.left;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    }
    setActive(points.length ? best : null);
  }

  const activePoint = active != null ? points[active] : undefined;

  return (
    <div className="vt-chart" ref={ref}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`${title}: ${type} chart with ${points.length} points`}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className="vt-chart__grid"
            />
            <text x={PAD.left - 6} y={y(t)} className="vt-chart__tick" textAnchor="end" dy="0.32em">
              {formatNumber(t, 1)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text
              key={p.date}
              x={x(i)}
              y={HEIGHT - 6}
              className="vt-chart__tick"
              textAnchor="middle"
            >
              {shortLabel(p.date, bucket)}
            </text>
          ) : null,
        )}

        {type === 'bar'
          ? points.map((p, i) => {
              const top = y(p.value);
              const h = Math.max(0, y(yMin) - top);
              const r = Math.min(4, barWidth / 2, h);
              const left = x(i) - barWidth / 2;
              const base = y(yMin);
              // Rounded top, square base anchored to the axis.
              const d = `M${left},${base}V${top + r}Q${left},${top} ${left + r},${top}H${left + barWidth - r}Q${left + barWidth},${top} ${left + barWidth},${top + r}V${base}Z`;
              return (
                <path
                  key={p.date}
                  d={d}
                  className={`vt-chart__bar ${active === i ? 'vt-chart__bar--active' : ''}`}
                />
              );
            })
          : points.length > 0 && <path d={linePath} className="vt-chart__line" />}

        {activePoint && (
          <g>
            {type === 'line' && (
              <>
                <line
                  x1={x(active!)}
                  x2={x(active!)}
                  y1={PAD.top}
                  y2={PAD.top + innerH}
                  className="vt-chart__crosshair"
                />
                <circle cx={x(active!)} cy={y(activePoint.value)} r={5} className="vt-chart__dot" />
              </>
            )}
          </g>
        )}
        {type === 'line' && points.length === 1 && (
          <circle cx={x(0)} cy={y(points[0]!.value)} r={4} className="vt-chart__dot" />
        )}
      </svg>

      {activePoint && (
        <div
          className="vt-chart__tooltip"
          style={{
            left: Math.min(Math.max(x(active!), 60), width - 60),
            top: Math.max(0, y(activePoint.value) - 44),
          }}
          role="status"
        >
          <strong>
            {formatNumber(activePoint.value)} {series.unit}
          </strong>
          <span>{formatBucket(activePoint.date, bucket)}</span>
        </div>
      )}

      <details className="vt-chart__table">
        <summary>Show data</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{bucket === 'day' ? 'Day' : bucket === 'week' ? 'Week' : 'Month'}</th>
              <th scope="col">{series.unit}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.date}>
                <td>{formatBucket(p.date, bucket)}</td>
                <td>{formatNumber(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
