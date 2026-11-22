/**
 * Spacing, corner radius and layout tokens.
 * Unitless: React Native points on mobile, CSS pixels on the web.
 */

/** 4-point spacing scale. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  /** Input boxes and small buttons. */
  md: 10,
  /** Cards and the primary button. */
  lg: 14,
  pill: 999,
} as const;

export const layout = {
  /** Horizontal padding between the screen edge and content. */
  screenGutter: 20,
  /** Height of the top bar with the title and profile picture. */
  topBarHeight: 56,
  /** Height of the bottom tab bar, excluding the device's safe area. */
  bottomBarHeight: 64,
  /** Minimum size of anything tappable. */
  minTouchTarget: 44,
  /** Height of a set row in the workout logger. */
  setRowHeight: 48,
  /** Diameter of the profile picture in the top bar. */
  avatarSize: 36,
  /** Upper limit for the side menu width on tablets and desktops. */
  sideMenuMaxWidth: 420,
  /** Window width from which the web app shows a sidebar instead of the bottom bar. */
  desktopBreakpoint: 900,
} as const;

export interface Size {
  width: number;
  height: number;
}

/**
 * Width of the side menu that slides out from the profile picture.
 *
 * - Phone held upright: covers the whole screen.
 * - Phone held sideways: keeps the width it had upright (the short side of the
 *   screen), so it covers only part of the screen with the same proportions.
 * - Tablets and desktops: never wider than `layout.sideMenuMaxWidth`.
 */
export function sideMenuWidth({ width, height }: Size): number {
  const shortSide = Math.min(width, height);
  return Math.min(width, shortSide, layout.sideMenuMaxWidth);
}
