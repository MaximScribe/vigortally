import { buildThemeCss } from '@vigortally/ui';

const STYLE_ID = 'vt-tokens';

/** Adds the design tokens as CSS custom properties to the document (once). */
export function injectThemeTokens(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = buildThemeCss();
  doc.head.prepend(style);
}
