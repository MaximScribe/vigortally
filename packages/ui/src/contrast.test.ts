import { expect, test } from 'vitest';
import { contrastRatio, parseHex, relativeLuminance } from './contrast';

test('parses hex colors', () => {
  expect(parseHex('#3d9df5')).toEqual([0x3d, 0x9d, 0xf5]);
  expect(() => parseHex('blue')).toThrow();
});

test('luminance spans black to white', () => {
  expect(relativeLuminance('#000000')).toBe(0);
  expect(relativeLuminance('#ffffff')).toBe(1);
});

test('contrast ratio matches the WCAG reference values', () => {
  expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
  // Order does not matter.
  expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#777777'));
});
