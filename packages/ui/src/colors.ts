/**
 * Color tokens.
 *
 * Dark first: a calm slate background, slightly lighter cards with thin borders,
 * and one bright blue accent for primary actions, titles and set numbers.
 * Every theme defines exactly the same keys, so components never branch on the theme.
 */

export interface ColorTokens {
  /** App background behind everything. */
  background: string;
  /** Cards, sheets and the bottom bar. */
  surface: string;
  /** Elements on top of a surface: pressed rows, menus. */
  surfaceRaised: string;
  /** Input fields such as the KG / REPS boxes in the set logger. */
  input: string;
  /** Thin card and divider lines. */
  border: string;

  /** Main text. */
  text: string;
  /** Secondary text: "Last performed", previous set values. */
  textMuted: string;
  /** Section labels, placeholders, inactive tab icons. */
  textSubtle: string;

  /** Primary actions, exercise titles, set numbers, active tab. */
  accent: string;
  /** Accent while pressed. */
  accentPressed: string;
  /** Text and icons on an accent-filled button. */
  onAccent: string;

  success: string;
  warning: string;
  danger: string;

  /** Set type markers in the workout logger (W, D, F). */
  setWarmup: string;
  setDrop: string;
  setFailure: string;

  /**
   * Macro ring segments in the nutrition tab. Validated as a categorical set (CVD and
   * normal-vision separation) for both themes; always shown with a text label too.
   */
  macroProtein: string;
  macroCarbs: string;
  macroFat: string;
}

export const darkColors: ColorTokens = {
  background: '#20262d',
  surface: '#272e36',
  surfaceRaised: '#303841',
  input: '#363f49',
  border: '#3a434d',

  text: '#f3f5f7',
  textMuted: '#a7b0ba',
  textSubtle: '#8a95a1',

  accent: '#3a95e9',
  accentPressed: '#2b86dc',
  onAccent: '#ffffff',

  success: '#3ccf87',
  warning: '#f4b740',
  danger: '#f25f63',

  setWarmup: '#f4b740',
  setDrop: '#a978ff',
  setFailure: '#f25f63',

  macroProtein: '#1baf7a',
  macroCarbs: '#c98500',
  macroFat: '#d55181',
};

export const lightColors: ColorTokens = {
  background: '#f3f5f7',
  surface: '#ffffff',
  surfaceRaised: '#e9edf1',
  input: '#eef1f4',
  border: '#d9dfe5',

  text: '#12181e',
  textMuted: '#4f5b67',
  textSubtle: '#6b7682',

  accent: '#1672cc',
  accentPressed: '#105eab',
  onAccent: '#ffffff',

  success: '#16834f',
  warning: '#9a6400',
  danger: '#c62f35',

  setWarmup: '#9a6400',
  setDrop: '#7a3fe0',
  setFailure: '#c62f35',

  macroProtein: '#148a60',
  macroCarbs: '#b57a00',
  macroFat: '#c4467a',
};

export type ThemeName = 'dark' | 'light';

export const colors: Record<ThemeName, ColorTokens> = {
  dark: darkColors,
  light: lightColors,
};
