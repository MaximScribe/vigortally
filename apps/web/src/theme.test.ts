import { expect, test } from 'vitest';
import { injectThemeTokens } from './theme';

test('injects the token stylesheet exactly once', () => {
  injectThemeTokens();
  injectThemeTokens();

  const styles = document.querySelectorAll('style#vt-tokens');
  expect(styles).toHaveLength(1);
  expect(styles[0]?.textContent).toContain('--vt-color-accent');
});
