import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { renderApp } from '../test/renderApp';

function setViewport(width: number, height: number) {
  Object.assign(window, { innerWidth: width, innerHeight: height });
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
}

async function openMenu() {
  const app = renderApp('/activities');
  await app.user.click(await screen.findByRole('button', { name: 'Open menu' }));
  return { ...app, dialog: screen.getByRole('dialog', { name: 'Menu' }) };
}

describe('side menu', () => {
  afterEach(() => setViewport(1024, 768));

  test('is closed initially', async () => {
    renderApp('/activities');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('opens from the profile button and lists the settings areas', async () => {
    const { dialog } = await openMenu();
    expect(dialog).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    for (const label of ['Settings', 'Connected devices', 'Integrations']) {
      expect(dialog).toHaveTextContent(label);
    }
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveFocus();
  });

  test('closes with the close button and returns focus to the profile button', async () => {
    const { user } = await openMenu();
    await user.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
  });

  test('closes with Escape', async () => {
    const { user } = await openMenu();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('covers an upright phone and keeps that width sideways', async () => {
    setViewport(390, 844);
    const { dialog } = await openMenu();
    expect(dialog.style.width).toBe('390px');

    setViewport(844, 390);
    expect(dialog.style.width).toBe('390px');
  });
});
