import type { Series, Widget, WidgetInput } from '@vigortally/schema';
import { screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { FakeServer } from '../test/fakeServer';
import { renderApp } from '../test/renderApp';
import { niceTicks } from './Chart';

const ids = {
  weight: '00000000-0000-4000-8000-0000000000e1',
  workouts: '00000000-0000-4000-8000-0000000000e2',
};

function statsServer() {
  const widgets: Widget[] = [
    {
      id: ids.weight,
      position: 0,
      title: 'Weight trend',
      metric: 'weight',
      chart: 'line',
      rangeDays: 90,
      bucket: 'day',
      exerciseId: null,
      activityTypeId: null,
    },
    {
      id: ids.workouts,
      position: 1,
      title: 'Workouts (30 days)',
      metric: 'workouts',
      chart: 'number',
      rangeDays: 30,
      bucket: 'day',
      exerciseId: null,
      activityTypeId: null,
    },
  ];
  const series: Record<string, Series> = {
    weight: {
      metric: 'weight',
      unit: 'kg',
      points: [
        { date: '2026-11-01', value: 82 },
        { date: '2026-11-15', value: 81.2 },
        { date: '2026-11-22', value: 80.6 },
      ],
      summary: 80.6,
      summaryLabel: 'latest',
    },
    workouts: {
      metric: 'workouts',
      unit: 'workouts',
      points: [{ date: '2026-11-20', value: 1 }],
      summary: 12,
      summaryLabel: 'total',
    },
    protein: { metric: 'protein', unit: 'g', points: [], summary: null, summaryLabel: 'average' },
  };
  const server = new FakeServer()
    .on('GET', '/dashboard', () => widgets)
    .on('GET', '/stats/series', ({ query }) => series[query.get('metric')!])
    .on('GET', '/exercises', () => [])
    .on('GET', '/activity-types', () => [])
    .on('PUT', '/dashboard/widgets/:id', ({ body }) => {
      const widget = { ...(body as WidgetInput), position: widgets.length } as Widget;
      widgets.push(widget);
      return widget;
    });
  return { server, widgets };
}

test('nice ticks', () => {
  expect(niceTicks(0, 950)).toEqual([0, 250, 500, 750, 1000]);
  expect(niceTicks(80.6, 82)).toEqual([80.5, 81, 81.5, 82]);
  // The top tick always covers the maximum (bars used to poke out above 2,000).
  expect(niceTicks(0, 2194).at(-1)).toBeGreaterThanOrEqual(2194);
  expect(niceTicks(0, 13_480).at(-1)).toBeGreaterThanOrEqual(13_480);
});

describe('statistics dashboard', () => {
  test('shows line and number widgets with summaries and a data table', async () => {
    const { server } = statsServer();
    renderApp('/statistics', server);

    const weight = within(await screen.findByRole('article', { name: 'Weight trend' }));
    expect(await weight.findByText('latest 80.6 kg')).toBeVisible();
    expect(weight.getByRole('img', { name: /line chart with 3 points/ })).toBeInTheDocument();
    expect(weight.getAllByRole('row')).toHaveLength(4);

    const workouts = within(screen.getByRole('article', { name: 'Workouts (30 days)' }));
    expect(await workouts.findByText('12')).toBeVisible();
  });

  test('adds a widget for any metric', async () => {
    const { server, widgets } = statsServer();
    const { user } = renderApp('/statistics', server);

    await user.click(await screen.findByRole('button', { name: /Add widget/ }));
    const sheet = within(await screen.findByRole('dialog', { name: 'Add widget' }));
    await user.selectOptions(sheet.getByLabelText('Metric'), 'protein');
    await user.selectOptions(sheet.getByLabelText('Show as'), 'bar');
    await user.selectOptions(sheet.getByLabelText('Group by'), 'week');
    await user.click(sheet.getByRole('button', { name: 'Save' }));

    const card = within(await screen.findByRole('article', { name: 'Protein' }));
    expect(await card.findByText('No data in this time range yet.')).toBeVisible();
    expect(widgets.at(-1)).toMatchObject({ metric: 'protein', chart: 'bar', bucket: 'week' });
  });
});
