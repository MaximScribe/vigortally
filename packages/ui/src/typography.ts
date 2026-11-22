/**
 * Typography tokens.
 *
 * Sizes are unitless so they work as React Native points and as CSS pixels.
 * The system font is used everywhere: it is crisp, loads instantly and feels native
 * on every platform.
 */

export const fontFamily = {
  /** CSS font stack for the web app. The companion app uses the platform default. */
  web: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

export type FontWeight = '400' | '500' | '600' | '700';

export interface TextStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: FontWeight;
  /** Extra space between letters, in points / pixels. */
  letterSpacing: number;
  textTransform: 'none' | 'uppercase';
  /** Use equal-width digits so numbers in tables and timers don't jump around. */
  tabularNumbers: boolean;
}

function style(
  fontSize: number,
  lineHeight: number,
  fontWeight: FontWeight,
  extra: Partial<Pick<TextStyle, 'letterSpacing' | 'textTransform' | 'tabularNumbers'>> = {},
): TextStyle {
  return {
    fontSize,
    lineHeight,
    fontWeight,
    letterSpacing: 0,
    textTransform: 'none',
    tabularNumbers: false,
    ...extra,
  };
}

export const textStyles = {
  /** Big page title at the top of a tab ("Workout", "Nutrition"). */
  display: style(34, 41, '600'),
  /** Card titles ("Upper", "Lower") and sheet headings. */
  title: style(20, 26, '600'),
  /** Exercise names in the workout logger, usually in the accent color. */
  headline: style(18, 24, '500'),
  /** Regular reading text and list rows. */
  body: style(16, 22, '400'),
  /** Secondary lines ("Last performed: …", template exercise lists). */
  bodySmall: style(14, 20, '400'),
  /** Section labels ("QUICK START", "MY TEMPLATES") and table headers ("SET", "KG"). */
  label: style(13, 16, '500', { letterSpacing: 1.5, textTransform: 'uppercase' }),
  /** Text on buttons ("START AN EMPTY WORKOUT", "FINISH", "ADD SET"). */
  button: style(15, 20, '600', { letterSpacing: 1.2, textTransform: 'uppercase' }),
  /** Numbers in set rows, macro totals and timers. */
  numeric: style(17, 22, '500', { tabularNumbers: true }),
  /** Tiny hints and tab bar labels. */
  caption: style(12, 16, '400'),
} as const satisfies Record<string, TextStyle>;

export type TextStyleName = keyof typeof textStyles;
