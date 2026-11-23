/**
 * Calendar-day helpers on `YYYY-MM-DD` strings. Days are computed in UTC so that adding
 * days never trips over daylight-saving changes.
 */

export type IsoDate = string;

function parse(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function format(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

/** Today's date in the local time zone of the device or server. */
export function today(now: Date = new Date()): IsoDate {
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + days);
  return format(d);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: IsoDate): number {
  return parse(date).getUTCDay();
}

/** Whole days from `a` to `b` (negative when `b` is earlier). */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
}

/** Every day from `from` to `to`, inclusive. */
export function eachDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

/** The next date (today included) that falls on `targetWeekday`. */
export function nextWeekday(from: IsoDate, targetWeekday: number): IsoDate {
  const diff = (targetWeekday - weekday(from) + 7) % 7;
  return addDays(from, diff);
}

/** Monday of the week containing `date` (ISO weeks start on Monday). */
export function startOfWeek(date: IsoDate): IsoDate {
  return addDays(date, -((weekday(date) + 6) % 7));
}

export function startOfMonth(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`;
}
