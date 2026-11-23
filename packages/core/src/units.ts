import type { UnitSystem } from '@vigortally/schema';

export const KG_PER_LB = 0.45359237;
export const M_PER_MILE = 1609.344;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

/** Weight in the user's unit, rounded for display. */
export function displayWeight(kg: number, units: UnitSystem): { value: number; unit: string } {
  return units === 'imperial'
    ? { value: Math.round(kgToLb(kg) * 10) / 10, unit: 'lb' }
    : { value: Math.round(kg * 10) / 10, unit: 'kg' };
}

/** Converts a weight the user typed in their unit back to kg. */
export function inputWeightToKg(value: number, units: UnitSystem): number {
  return units === 'imperial' ? lbToKg(value) : value;
}

/** Distance in metres to km or miles. */
export function displayDistance(m: number, units: UnitSystem): { value: number; unit: string } {
  return units === 'imperial'
    ? { value: Math.round((m / M_PER_MILE) * 100) / 100, unit: 'mi' }
    : { value: Math.round((m / 1000) * 100) / 100, unit: 'km' };
}

/** Seconds as `h:mm:ss` or `m:ss`. */
export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Parses `h:mm:ss`, `m:ss` or plain minutes into seconds. Returns null if invalid. */
export function parseDuration(text: string): number | null {
  const trimmed = text.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Math.round(Number(trimmed) * 60);
  const parts = trimmed.split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const numbers = parts.map(Number);
  if (numbers.slice(1).some((n) => n >= 60)) return null;
  return numbers.reduce((total, n) => total * 60 + n, 0);
}
