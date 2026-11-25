import { addDays, today } from '@vigortally/core';
import type { Widget } from '@vigortally/schema';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { MiniChart } from '../../src/charts';
import { Card, ErrorText, Muted, Screen } from '../../src/components';
import { useApi } from '../../src/session';
import { text, useColors } from '../../src/theme';

/** The same dashboard as the web app (edited there), read-only on the phone. */
export default function StatsTab() {
  const api = useApi();
  const widgets = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard.list });
  return (
    <Screen
      title="Statistics"
      refreshing={widgets.isRefetching}
      onRefresh={() => void widgets.refetch()}
    >
      {widgets.data?.map((w) => (
        <WidgetCard key={w.id} widget={w} />
      ))}
      {widgets.data?.length === 0 && <Muted>Add widgets in the web app.</Muted>}
      <ErrorText error={widgets.error} />
    </Screen>
  );
}

function WidgetCard({ widget }: { widget: Widget }) {
  const c = useColors();
  const api = useApi();
  const [width, setWidth] = useState(300);
  const to = today();
  const from = addDays(to, -(widget.rangeDays - 1));
  const series = useQuery({
    queryKey: [
      'series',
      widget.metric,
      from,
      to,
      widget.bucket,
      widget.exerciseId,
      widget.activityTypeId,
    ],
    queryFn: () =>
      api.stats.series({
        metric: widget.metric,
        from,
        to,
        bucket: widget.bucket,
        exerciseId: widget.exerciseId ?? undefined,
        activityTypeId: widget.activityTypeId ?? undefined,
      }),
  });
  const data = series.data;

  return (
    <Card>
      <View>
        <Text style={text('body', c.text)}>{widget.title}</Text>
        {data?.summary != null && (
          <Muted>
            {data.summaryLabel}{' '}
            {new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(data.summary)}{' '}
            {data.unit}
          </Muted>
        )}
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {!data || data.points.length === 0 ? (
          <Muted>No data in this time range yet.</Muted>
        ) : widget.chart === 'number' ? (
          <Text style={[text('display', c.text), { fontSize: 44, lineHeight: 50 }]}>
            {new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
              data.summary ?? 0,
            )}
          </Text>
        ) : (
          <MiniChart series={data} type={widget.chart} width={width} />
        )}
      </View>
      <ErrorText error={series.error} />
    </Card>
  );
}
