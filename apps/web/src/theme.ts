import { buildThemeCss, colors, type ThemeName } from '@vigortally/ui';

const STYLE_ID = 'vt-tokens';
const STORAGE_KEY = 'vigortally.theme';

/** `system` follows the OS setting; the others force a theme. */
export type ThemePreference = 'system' | ThemeName;

/** Adds the design tokens as CSS custom properties to the document (once). */
export function injectThemeTokens(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = buildThemeCss();
  doc.head.prepend(style);
}

function isPreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'dark' || value === 'light';
}

/** Reads the saved preference. Storage can be unavailable (private mode), so never throws. */
export function loadThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isPreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function saveThemePreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Not persisted; the choice still applies for this visit.
  }
}

/** Applies a preference to the page: `data-theme` on <html> and the browser UI color. */
export function applyThemePreference(preference: ThemePreference, doc: Document = document): void {
  const root = doc.documentElement;
  if (preference === 'system') delete root.dataset.theme;
  else root.dataset.theme = preference;

  const effective: ThemeName =
    preference !== 'system'
      ? preference
      : window.matchMedia?.('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
  doc
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', colors[effective].background);
}
