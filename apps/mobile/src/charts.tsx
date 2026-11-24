import type { Nutrients, Profile, Series } from '@vigortally/schema';
import { Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { spacing, text, useColors } from './theme';

const format = (n: number, digits = 0) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(n);

/** Donut of where today's energy came from, calories in the middle, labelled bars below. */
export function MacroRing({ totals, targets }: { totals: Nutrients; targets: Profile['targets'] }) {
  const c = useColors();
  const size = 160;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const macros = [
    { key: 'protein', label: 'Protein', kcal: totals.protein * 4, color: c.macroProtein },
    { key: 'carbs', label: 'Carbs', kcal: totals.carbs * 4, color: c.macroCarbs },
    { key: 'fat', label: 'Fat', kcal: totals.fat * 9, color: c.macroFat },
  ] as const;
  const total = macros.reduce((s, m) => s + m.kcal, 0);
  const shares = macros.map((m) => (total > 0 ? m.kcal / total : 0));
  const remaining = targets.kcal - totals.kcal;

  return (
    <View style={{ alignItems: 'center', gap: spacing.lg }}>
      <View
        accessible
        accessibilityLabel={`${Math.round(totals.kcal)} of ${targets.kcal} kilocalories`}
        style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      >
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={c.surfaceRaised}
            strokeWidth={stroke}
            fill="none"
          />
          {total > 0 &&
            macros.map((m, i) => {
              const length = shares[i]! * circumference;
              const offset = shares.slice(0, i).reduce((s, x) => s + x * circumference, 0);
              const visible = Math.max(0, length - (shares[i]! < 1 ? 3 : 0));
              return visible > 0 ? (
                <Circle
                  key={m.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={m.color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${visible} ${circumference - visible}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              ) : null;
            })}
        </Svg>
        <Text style={[text('display', c.text), { fontSize: 30, lineHeight: 34 }]}>
          {format(totals.kcal)}
        </Text>
        <Text style={text('bodySmall', c.textMuted)}>of {format(targets.kcal)} kcal</Text>
        <Text style={text('caption', remaining < 0 ? c.warning : c.textMuted)}>
          {remaining >= 0 ? `${format(remaining)} LEFT` : `${format(-remaining)} OVER`}
        </Text>
      </View>
      <View style={{ alignSelf: 'stretch', gap: spacing.md }}>
        {macros.map((m) => {
          const value = totals[m.key];
          const target = targets[m.key];
          const pct = target > 0 ? Math.min(1, value / target) : 0;
          return (
            <View
              key={m.key}
              accessible
              accessibilityLabel={`${m.label} ${Math.round(value)} of ${target} grams`}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  marginBottom: 4,
                }}
              >
                <View
                  style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: m.color }}
                />
                <Text style={[text('body', c.text), { flex: 1 }]}>{m.label}</Text>
                <Text style={text('body', c.textMuted)}>
                  {format(value)} / {format(target)} g
                </Text>
              </View>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: c.surfaceRaised,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${pct * 100}%`,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: m.color,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Compact single-series chart for dashboard widgets (the web app has the full version). */
export function MiniChart({
  series,
  type,
  width,
}: {
  series: Series;
  type: 'line' | 'bar';
  width: number;
}) {
  const c = useColors();
  const height = 120;
  const points = series.points;
  if (points.length === 0) return null;
  const values = points.map((p) => p.value);
  const lo = type === 'bar' ? 0 : Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const y = (v: number) => height - 4 - ((v - lo) / span) * (height - 8);
  const step = width / points.length;
  const x = (i: number) =>
    type === 'bar'
      ? step * i + step / 2
      : points.length === 1
        ? width / 2
        : (width * i) / (points.length - 1);
  const barWidth = Math.max(2, Math.min(24, step - 2));
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join('');

  return (
    <Svg
      width={width}
      height={height}
      accessibilityLabel={`${type} chart, ${points.length} values from ${format(Math.min(...values), 1)} to ${format(hi, 1)} ${series.unit}`}
    >
      {type === 'bar' ? (
        points.map((p, i) => (
          <Rect
            key={p.date}
            x={x(i) - barWidth / 2}
            y={y(p.value)}
            width={barWidth}
            height={Math.max(0, y(lo) - y(p.value))}
            rx={Math.min(4, barWidth / 2)}
            fill={c.accent}
          />
        ))
      ) : (
        <Path
          d={path}
          stroke={c.accent}
          strokeWidth={2}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}
