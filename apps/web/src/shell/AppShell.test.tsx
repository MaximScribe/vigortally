import { screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { renderApp } from '../test/renderApp';

function bottomBar() {
  // Both navs are in the DOM (CSS decides which is visible); the bottom one is last.
  const navs = screen.getAllByRole('navigation', { name: 'Main' });
  const bottom = navs.at(-1);
  if (!bottom) throw new Error('bottom bar not rendered');
  return within(bottom);
}

describe('app shell', () => {
  test('opens on the Activities tab', async () => {
    const { router } = renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Activities' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/activities');
  });

  test('shows the three tabs in order with Activities in the middle', async () => {
    renderApp('/activities');
    await screen.findByRole('heading', { level: 1 });
    const labels = bottomBar()
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(labels).toEqual(['Nutrition', 'Activities', 'Stats']);
  });

  test('switches pages from the tab bar and marks the active tab', async () => {
    const { user } = renderApp('/activities');
    await screen.findByRole('heading', { level: 1, name: 'Activities' });

    await user.click(bottomBar().getByRole('link', { name: 'Nutrition' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Nutrition' })).toBeVisible();
    expect(bottomBar().getByRole('link', { name: 'Nutrition' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(bottomBar().getByRole('link', { name: 'Activities' })).not.toHaveAttribute(
      'aria-current',
    );

    await user.click(bottomBar().getByRole('link', { name: 'Stats' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Statistics' })).toBeVisible();
  });

  test('has a profile button in the top bar', async () => {
    renderApp('/nutrition');
    expect(await screen.findByRole('button', { name: 'Open menu' })).toBeVisible();
  });
});
