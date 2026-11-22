import { colors } from '@vigortally/ui';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  applyThemePreference,
  injectThemeTokens,
  loadThemePreference,
  saveThemePreference,
} from './theme';

test('injects the token stylesheet exactly once', () => {
  injectThemeTokens();
  injectThemeTokens();

  const styles = document.querySelectorAll('style#vt-tokens');
  expect(styles).toHaveLength(1);
  expect(styles[0]?.textContent).toContain('--vt-color-accent');
});

describe('theme preference', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  test('defaults to system', () => {
    expect(loadThemePreference()).toBe('system');
  });

  test('remembers a forced theme and forgets it again for system', () => {
    saveThemePreference('light');
    expect(loadThemePreference()).toBe('light');
    saveThemePreference('system');
    expect(loadThemePreference()).toBe('system');
  });

  test('ignores garbage in storage', () => {
    window.localStorage.setItem('vigortally.theme', 'purple');
    expect(loadThemePreference()).toBe('system');
  });

  test('sets data-theme and the browser theme color', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);

    applyThemePreference('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(meta.content).toBe(colors.light.background);

    applyThemePreference('system');
    expect(document.documentElement.dataset.theme).toBeUndefined();
    meta.remove();
  });
});
