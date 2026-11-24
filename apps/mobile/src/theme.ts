import { colors, layout, radius, spacing, textStyles, type ColorTokens } from '@vigortally/ui';
import { useColorScheme, type TextStyle } from 'react-native';

/** Colors for the current system theme (dark first, like the web app). */
export function useColors(): ColorTokens {
  return useColorScheme() === 'light' ? colors.light : colors.dark;
}

type StyleName = keyof typeof textStyles;

/** A text style from the shared tokens, ready for React Native. */
export function text(name: StyleName, color?: string): TextStyle {
  const s = textStyles[name];
  return {
    fontSize: s.fontSize,
    lineHeight: s.lineHeight,
    fontWeight: s.fontWeight,
    letterSpacing: s.letterSpacing,
    textTransform: s.textTransform,
    fontVariant: s.tabularNumbers ? ['tabular-nums'] : undefined,
    color,
  };
}

export { layout, radius, spacing };
