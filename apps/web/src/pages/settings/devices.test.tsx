import type { Device } from '@vigortally/schema';
import { screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { FakeServer } from '../../test/fakeServer';
import { renderApp } from '../../test/renderApp';

test('shows a pairing code with QR and lets you sign out other devices', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const devices: Device[] = [
    {
      id: '00000000-0000-4000-8000-0000000000a1',
      name: 'Firefox on Windows',
      kind: 'web',
      createdAt: '2026-11-20T10:00:00Z',
      lastUsedAt: '2026-11-23T10:00:00Z',
      current: true,
    },
    {
      id: '00000000-0000-4000-8000-0000000000a2',
      name: 'Pixel 9',
      kind: 'device',
      createdAt: '2026-11-21T10:00:00Z',
      lastUsedAt: '2026-11-22T18:00:00Z',
      current: false,
    },
  ];
  const server = new FakeServer()
    .on('GET', '/devices', () => devices)
    .on('POST', '/devices/pairing', () => ({
      code: 'ABCD-EFGH',
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      link: 'vigortally://pair?server=https%3A%2F%2Fvt.example.ts.net&code=ABCD-EFGH',
      serverUrl: 'https://vt.example.ts.net',
    }))
    .on('DELETE', '/devices/:id', ({ params }) => {
      devices.splice(
        devices.findIndex((d) => d.id === params.id),
        1,
      );
      return undefined;
    });
  const { user } = renderApp('/settings/devices', server);

  await user.click(await screen.findByRole('button', { name: 'Connect app' }));
  expect(await screen.findByLabelText('Pairing code')).toHaveTextContent('ABCD-EFGH');
  expect(screen.getByText('https://vt.example.ts.net')).toBeVisible();
  expect(await screen.findByRole('img', { name: /QR code/ })).toContainHTML('<svg');

  const main = within(screen.getByRole('main'));
  expect(main.getByText('Pixel 9')).toBeVisible();
  await user.click(main.getByRole('button', { name: 'Sign out' }));
  await vi.waitFor(() => expect(main.queryByText('Pixel 9')).not.toBeInTheDocument());
});
