import type { Band, Forecast, ForecastInput, MediaParams, Status, Triple } from './types';
import { BAND_INDEX } from './types';
import { addDays, diffDays } from './dates';

export const TARGET_UG_L = 10;
export const LIMITS = {
  c0: [0, 3000], litresPerDay: [1, 200], massG: [10, 5000], k: [0.05, 10],
} as const;

function check(name: keyof typeof LIMITS, v: number) {
  const [lo, hi] = LIMITS[name];
  if (!Number.isFinite(v) || v < lo || v > hi) throw new RangeError(`${name} must be ${lo}–${hi} (got ${v})`);
}

/** Langmuir equilibrium loading qe (mg/g) at concentration C (mg/L). */
export function langmuirQe(qmax: number, b: number, cMgL: number): number {
  if (!(qmax > 0) || !(b > 0) || !(cMgL >= 0)) throw new RangeError('langmuirQe: invalid input');
  return (qmax * b * cMgL) / (1 + b * cMgL);
}

/** Usable pouch capacity (mg As) for one band: massG · qe · derate · fBT · k. */
export function pouchCapacityMg(p: MediaParams, band: Band, massG: number, c0: number, k = 1): number {
  check('massG', massG); check('c0', c0); check('k', k);
  const i = BAND_INDEX[band];
  return massG * langmuirQe(p.qmax[i], p.b, c0 / 1000) * p.derate[i] * p.fBT * k;
}

/** Arsenic load arriving at the filter per day (mg/day). */
export function dailyLoadMg(c0: number, litresPerDay: number): number {
  check('c0', c0); check('litresPerDay', litresPerDay);
  return (c0 / 1000) * litresPerDay;
}

const triple = (f: (b: Band) => number): Triple => ({ low: f('low'), mid: f('mid'), high: f('high') });

export function forecastPouch(input: ForecastInput): Forecast {
  const { c0, litresPerDay, massG, media, installedOn, today } = input;
  const k = input.k ?? 1;
  const target = input.targetUgL ?? TARGET_UG_L;
  check('litresPerDay', litresPerDay); check('massG', massG); check('k', k);
  const daysElapsed = diffDays(today, installedOn);

  const failedTest = (input.effluentTests ?? [])
    .filter(t => t.asUgL >= target && diffDays(t.date, installedOn) >= 0 && diffDays(today, t.date) >= 0)
    .sort((a, b) => diffDays(a.date, b.date))[0] ?? null;

  const base = { k, daysElapsed, failedTest, dailyLoadMg: null, qe: null, capacityMg: null, days: null, daysLeft: null, replaceBy: null };
  if (c0 == null) return { ...base, status: failedTest ? 'failed' : 'unknown_influent' };
  check('c0', c0);
  if (c0 <= target) return { ...base, status: failedTest ? 'failed' : 'not_needed' };

  const load = dailyLoadMg(c0, litresPerDay);
  const qe = triple(b => langmuirQe(media.qmax[BAND_INDEX[b]], media.b, c0 / 1000));
  const capacityMg = triple(b => pouchCapacityMg(media, b, massG, c0, k));
  const days = triple(b => capacityMg[b] / load);
  const daysLeft = triple(b => Math.floor(days[b]) - daysElapsed);
  const status: Status = failedTest ? 'failed' : daysLeft.low > 7 ? 'ok' : daysLeft.low > 0 ? 'due' : 'overdue';
  return {
    ...base, status, dailyLoadMg: load, qe, capacityMg, days, daysLeft,
    replaceBy: addDays(installedOn, Math.floor(days.low)),
  };
}
