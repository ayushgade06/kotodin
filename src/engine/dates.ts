import type { ISODate } from './types';

const DAY = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since 1970-01-01 (UTC midnight), so local timezones (e.g. IST) never shift a date. */
export function toDayNumber(d: ISODate): number {
  const m = ISO_RE.exec(d);
  if (!m) throw new RangeError(`Invalid ISO date: ${d}`);
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  if (new Date(t).toISOString().slice(0, 10) !== d) throw new RangeError(`Invalid ISO date: ${d}`);
  return Math.round(t / DAY);
}

export const fromDayNumber = (n: number): ISODate => new Date(n * DAY).toISOString().slice(0, 10);
export const addDays = (d: ISODate, n: number): ISODate => fromDayNumber(toDayNumber(d) + n);
export const diffDays = (a: ISODate, b: ISODate): number => toDayNumber(a) - toDayNumber(b);
export const isISODate = (d: unknown): d is ISODate => {
  if (typeof d !== 'string') return false;
  try { toDayNumber(d); return true; } catch { return false; }
};

/** The user's local calendar date as YYYY-MM-DD. */
export function todayISO(now = new Date()): ISODate {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
