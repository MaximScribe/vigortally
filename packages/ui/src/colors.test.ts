import { describe, expect, test } from 'vitest';
import { colors, type ColorTokens, type ThemeName } from './colors';
import { contrastRatio } from './contrast';

// WCAG AA: 4.5 for normal text, 3 for large/bold text and UI components.
const TEXT = 4.5;
const LARGE_OR_UI = 3;

const themes = Object.entries(colors) as [ThemeName, ColorTokens][];

describe.each(themes)('%s theme', (_name, c) => {
  test('every token is a #rrggbb color', () => {
    for (const value of Object.values(c)) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  test.each([
    ['text', 'background'],
    ['text', 'surface'],
    ['text', 'input'],
    ['textMuted', 'background'],
    ['textMuted', 'surface'],
  ] as const)('%s on %s is readable as body text', (fg, bg) => {
    expect(contrastRatio(c[fg], c[bg])).toBeGreaterThanOrEqual(TEXT);
  });

  test.each([
    ['textSubtle', 'background'],
    ['textSubtle', 'surface'],
    ['accent', 'background'],
    ['accent', 'surface'],
    ['onAccent', 'accent'],
    ['setWarmup', 'surface'],
    ['setDrop', 'surface'],
    ['setFailure', 'surface'],
    ['macroProtein', 'surface'],
    ['macroCarbs', 'surface'],
    ['macroFat', 'surface'],
  ] as const)('%s on %s is readable as large text / UI', (fg, bg) => {
    expect(contrastRatio(c[fg], c[bg])).toBeGreaterThanOrEqual(LARGE_OR_UI);
  });
});

test('both themes define the same tokens', () => {
  expect(Object.keys(colors.light).sort()).toEqual(Object.keys(colors.dark).sort());
});
