import { activityPresets } from '@vigortally/core';
import type { ActivitySession, ActivityTypeSummary } from '@vigortally/schema';
import { screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { FakeServer } from '../../test/fakeServer';
import { renderApp } from '../../test/renderApp';

function activityServer() {
  const types: ActivityTypeSummary[] = [];
  const sessions: ActivitySession[] = [];
  const server = new FakeServer()
    .on('GET', '/activity-presets', () => activityPresets)
    .on('GET', '/activity-types', () => types)
    .on('PUT', '/activity-types/:id', ({ body }) => {
      types.push({
        ...(body as ActivityTypeSummary),
        sessionCount: 0,
        lastAt: null,
        archived: false,
      });
      return body;
    })
    .on('GET', '/activity-sessions', () => sessions)
    .on('PUT', '/activity-sessions/:id', ({ body }) => {
      const session = { ...(body as ActivitySession), source: 'manual' };
      sessions.push(session);
      const type = types.find((t) => t.id === session.activityTypeId)!;
      type.sessionCount += 1;
      type.lastAt = session.startedAt;
      return session;
    })
    .on('GET', '/workouts', () => []);
  return { server, types, sessions };
}

test('adds a preset activity and logs a session with converted values', async () => {
  const { server, sessions } = activityServer();
  const { user } = renderApp('/activities', server);

  expect(await screen.findByText('No activities yet')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Add activity' }));
  const sheet = within(await screen.findByRole('dialog', { name: 'Add activity' }));
  await user.click(await sheet.findByRole('button', { name: /Running/ }));

  const link = await screen.findByRole('link', { name: /Running/ });
  expect(link).toHaveTextContent('No sessions yet');
  await user.click(link);

  expect(await screen.findByRole('heading', { level: 1, name: 'Running' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: /Log session/ }));
  const log = within(await screen.findByRole('dialog', { name: 'Log Running' }));
  await user.type(log.getByLabelText('Duration'), '30:15');
  await user.type(log.getByLabelText('Distance'), '5.2');
  await user.click(log.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText(/5\.2 km/)).toBeVisible();
  expect(sessions[0]).toMatchObject({ durationSec: 1815, values: { distance: 5200 } });
});

test('creates a custom activity with its own fields', async () => {
  const { server, types } = activityServer();
  const { user } = renderApp('/activities', server);

  await user.click(await screen.findByRole('button', { name: 'Add activity' }));
  await user.click(screen.getByRole('button', { name: 'Create custom activity' }));
  const sheet = within(screen.getByRole('dialog', { name: 'Custom activity' }));
  await user.type(sheet.getByLabelText('Name'), 'Boxing');
  await user.click(sheet.getByRole('button', { name: /Add field/ }));
  await user.type(sheet.getByLabelText('Field'), 'Rounds');
  await user.click(sheet.getByRole('button', { name: 'Add' }));

  expect(await screen.findByRole('link', { name: /Boxing/ })).toBeVisible();
  expect(types[0]).toMatchObject({
    name: 'Boxing',
    kind: 'session',
    fields: [{ key: 'rounds', label: 'Rounds', type: 'number' }],
  });
});
