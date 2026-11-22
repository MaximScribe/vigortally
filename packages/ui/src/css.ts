/**
 * Turns the design tokens into CSS custom properties for the web app.
 *
 * Theme selection:
 * - `<html data-theme="dark">` or `"light"` forces a theme (set from the user's settings).
 * - Without `data-theme`, the app is dark by default and follows the system when the
 *   system asks for light mode.
 */

import { colors, type ColorTokens } from './colors';
import { layout, radius, spacing } from './layout';
import { fontFamily, textStyles } from './typography';

const PREFIX = '--vt';

/** `textMuted` -> `text-muted`, `xxl` -> `xxl`. */
export function kebabCase(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

type Declarations = [name: string, value: string][];

function px(value: number): string {
  return value === 0 ? '0' : `${value}px`;
}

export function colorDeclarations(tokens: ColorTokens): Declarations {
  return Object.entries(tokens).map(([name, value]) => [
    `${PREFIX}-color-${kebabCase(name)}`,
    value,
  ]);
}

/** Everything that doesn't change between themes. */
export function staticDeclarations(): Declarations {
  const declarations: Declarations = [[`${PREFIX}-font-family`, fontFamily.web]];

  for (const [name, value] of Object.entries(spacing)) {
    declarations.push([`${PREFIX}-space-${name}`, px(value)]);
  }
  for (const [name, value] of Object.entries(radius)) {
    declarations.push([`${PREFIX}-radius-${name}`, px(value)]);
  }
  for (const [name, value] of Object.entries(layout)) {
    declarations.push([`${PREFIX}-${kebabCase(name)}`, px(value)]);
  }
  for (const [name, style] of Object.entries(textStyles)) {
    const base = `${PREFIX}-text-${kebabCase(name)}`;
    declarations.push(
      [`${base}-size`, px(style.fontSize)],
      [`${base}-line-height`, px(style.lineHeight)],
      [`${base}-weight`, style.fontWeight],
      [`${base}-letter-spacing`, px(style.letterSpacing)],
      [`${base}-transform`, style.textTransform],
      [`${base}-numeric`, style.tabularNumbers ? 'tabular-nums' : 'normal'],
    );
  }
  return declarations;
}

function block(selector: string, declarations: Declarations, indent = ''): string {
  const body = declarations.map(([name, value]) => `${indent}  ${name}: ${value};`).join('\n');
  return `${indent}${selector} {\n${body}\n${indent}}`;
}

/** Complete stylesheet with all tokens and both themes. */
export function buildThemeCss(): string {
  return [
    block(':root', [...staticDeclarations(), ['color-scheme', 'dark']]),
    block(':root,\n[data-theme="dark"]', colorDeclarations(colors.dark)),
    block('[data-theme="dark"]', [['color-scheme', 'dark']]),
    block('[data-theme="light"]', [...colorDeclarations(colors.light), ['color-scheme', 'light']]),
    `@media (prefers-color-scheme: light) {\n${block(
      ':root:not([data-theme])',
      [...colorDeclarations(colors.light), ['color-scheme', 'light']],
      '  ',
    )}\n}`,
  ].join('\n\n');
}
