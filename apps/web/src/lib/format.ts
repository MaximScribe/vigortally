import { today as todayIso, addDays } from '@vigortally/core';

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

function localIsoDate(date: Date): string {
  return todayIso(date);
}

/** "Today", "Yesterday", a weekday within the last week, else "Nov 6, 2025". */
export function formatDay(value: string | Date, now = new Date()): string {
  const date =
    typeof value === 'string' ? new Date(value.length === 10 ? `${value}T12:00:00` : value) : value;
  const day = localIsoDate(date);
  const today = localIsoDate(now);
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  if (day === addDays(today, 1)) return 'Tomorrow';
  if (day > addDays(today, -7) && day < today) return weekdayFormat.format(date);
  return dateFormat.format(date);
}

export function formatTime(value: string | Date): string {
  return timeFormat.format(typeof value === 'string' ? new Date(value) : value);
}

/** Value for `<input type="datetime-local">` in local time. */
export function toDateTimeLocal(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function fromDateTimeLocal(value: string): string {
  return new Date(value).toISOString();
}

export function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}
