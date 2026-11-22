import { describe, expect, test } from 'vitest';
import { layout, sideMenuWidth, spacing } from './layout';

describe('sideMenuWidth', () => {
  test('covers the whole screen on an upright phone', () => {
    expect(sideMenuWidth({ width: 390, height: 844 })).toBe(390);
  });

  test('keeps its upright width on a sideways phone', () => {
    const upright = sideMenuWidth({ width: 390, height: 844 });
    expect(sideMenuWidth({ width: 844, height: 390 })).toBe(upright);
  });

  test('is capped on tablets and desktops', () => {
    expect(sideMenuWidth({ width: 1920, height: 1080 })).toBe(layout.sideMenuMaxWidth);
    expect(sideMenuWidth({ width: 820, height: 1180 })).toBe(layout.sideMenuMaxWidth);
  });
});

test('spacing follows the 4-point grid', () => {
  for (const [name, value] of Object.entries(spacing)) {
    if (name === 'xxs') continue; // hairline exception
    expect(value % 4, name).toBe(0);
  }
});

test('interactive rows are at least a comfortable touch target', () => {
  expect(layout.setRowHeight).toBeGreaterThanOrEqual(layout.minTouchTarget);
  expect(layout.bottomBarHeight).toBeGreaterThanOrEqual(layout.minTouchTarget);
});
