import { describe, expect, test } from 'vitest';
import { colors } from './colors';
import { buildThemeCss, colorDeclarations, kebabCase, staticDeclarations } from './css';

test('kebabCase converts token names', () => {
  expect(kebabCase('textMuted')).toBe('text-muted');
  expect(kebabCase('onAccent')).toBe('on-accent');
  expect(kebabCase('xxl')).toBe('xxl');
});

test('every color token becomes a variable', () => {
  const declarations = colorDeclarations(colors.dark);
  expect(declarations).toHaveLength(Object.keys(colors.dark).length);
  expect(declarations).toContainEqual(['--vt-color-text-muted', colors.dark.textMuted]);
});

test('static tokens use px and keep text styles together', () => {
  const declarations = Object.fromEntries(staticDeclarations());
  expect(declarations['--vt-space-lg']).toBe('16px');
  expect(declarations['--vt-space-none']).toBe('0');
  expect(declarations['--vt-radius-lg']).toBe('14px');
  expect(declarations['--vt-screen-gutter']).toBe('20px');
  expect(declarations['--vt-text-label-transform']).toBe('uppercase');
  expect(declarations['--vt-text-numeric-numeric']).toBe('tabular-nums');
});

describe('buildThemeCss', () => {
  const css = buildThemeCss();

  test('is dark by default', () => {
    expect(css).toMatch(/:root,\n\[data-theme="dark"\] \{[^}]*--vt-color-background: #20262d;/);
  });

  test('can be forced to light', () => {
    expect(css).toMatch(/\[data-theme="light"\] \{[^}]*--vt-color-background: #f3f5f7;/);
  });

  test('follows a light system preference only without an explicit choice', () => {
    expect(css).toMatch(
      /@media \(prefers-color-scheme: light\) \{\s*:root:not\(\[data-theme\]\) \{[^}]*--vt-color-background: #f3f5f7;/,
    );
  });

  test('has balanced braces', () => {
    expect(css.split('{').length).toBe(css.split('}').length);
  });
});
