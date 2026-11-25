import type { MediaParams, Well } from './types';
import { langmuirQe } from './model';
import { median } from './calibrate';
import { TARGET_UG_L } from './model';

/** Upper bin edges in days (inclusive); the last bin is "> 365". */
export const BIN_EDGES = [7, 14, 30, 60, 90, 180, 365] as const;
export const BIN_LABELS = ['0–7', '8–14', '15–30', '31–60', '61–90', '91–180', '181–365', '>365'] as const;

export type Basis = 'low' | 'mid';

export interface BasisStats {
  bins: number[];
  pctUnder30: number; // % of analysed wells needing replacement more often than monthly
  medianDays: number | null;
  annualPouchesMedian: number | null;
  annualCostMedianBDT: number | null;
}

export interface SweepResult {
  total: number;
  analysed: number; // wells above target, where a filter is needed
  notNeeded: number;
  pctNotNeeded: number;
  /** Days to breakthrough per input well (NaN where no filter is needed), aligned with the input array. */
  dMid: Float64Array;
  dLow: Float64Array;
  mid: BasisStats;
  low: BasisStats;
}

export function binIndex(days: number): number {
  for (let i = 0; i < BIN_EDGES.length; i++) if (days <= BIN_EDGES[i]) return i;
  return BIN_EDGES.length;
}

/** Days-to-breakthrough per gram of media, per well — D is linear in mass, so D = mass × perGram. */
function perGramDays(wells: Well[], p: MediaParams, litresPerDay: number, band: 0 | 1): Float64Array {
  const out = new Float64Array(wells.length);
  for (let i = 0; i < wells.length; i++) {
    const c0 = wells[i].asUgL;
    if (c0 <= TARGET_UG_L) { out[i] = NaN; continue; }
    const c = c0 / 1000;
    out[i] = (langmuirQe(p.qmax[band], p.b, c) * p.derate[band] * p.fBT) / (c * litresPerDay);
  }
  return out;
}

function statsFor(d: Float64Array, cost: number): BasisStats {
  const bins = new Array(BIN_LABELS.length).fill(0);
  const vals: number[] = [];
  let under30 = 0;
  for (const x of d) {
    if (Number.isNaN(x)) continue;
    vals.push(x);
    bins[binIndex(x)]++;
    if (x < 30) under30++;
  }
  const med = median(vals);
  const pouches = median(vals.map(x => 365 / x));
  return {
    bins,
    pctUnder30: vals.length ? (100 * under30) / vals.length : 0,
    medianDays: med,
    annualPouchesMedian: pouches,
    annualCostMedianBDT: pouches == null ? null : pouches * cost,
  };
}

export function designLabSweep(wells: Well[], p: MediaParams, massG: number, members: number, lpdPerPerson: number): SweepResult {
  if (!(massG >= 10 && massG <= 5000)) throw new RangeError('massG must be 10–5000');
  if (!(members >= 1 && members <= 20)) throw new RangeError('members must be 1–20');
  if (!(lpdPerPerson >= 1 && lpdPerPerson <= 20)) throw new RangeError('litres per person must be 1–20');
  const lpd = members * lpdPerPerson;
  const dMid = perGramDays(wells, p, lpd, 1).map(x => x * massG);
  const dLow = perGramDays(wells, p, lpd, 0).map(x => x * massG);
  let notNeeded = 0;
  for (const x of dMid) if (Number.isNaN(x)) notNeeded++;
  return {
    total: wells.length,
    analysed: wells.length - notNeeded,
    notNeeded,
    pctNotNeeded: wells.length ? (100 * notNeeded) / wells.length : 0,
    dMid, dLow,
    mid: statsFor(dMid, p.pouchCostBDT),
    low: statsFor(dLow, p.pouchCostBDT),
  };
}

/**
 * Smallest pouch mass (g) so that `share` of filter-needing wells last at least `targetDays`.
 * Exact (no search needed): D_i = mass × perGram_i, so the answer is targetDays / quantile(perGram).
 */
export function findMassForTarget(
  wells: Well[], p: MediaParams, members: number, lpdPerPerson: number,
  targetDays = 30, share = 0.9, basis: Basis = 'mid',
): { massG: number; achievable: boolean } | null {
  if (!(share > 0 && share <= 1) || !(targetDays > 0)) throw new RangeError('invalid target');
  const per = Array.from(perGramDays(wells, p, members * lpdPerPerson, basis === 'mid' ? 1 : 0))
    .filter(x => !Number.isNaN(x))
    .sort((a, b) => a - b);
  if (per.length === 0) return null;
  const j = per.length - Math.ceil(share * per.length);
  const massG = Math.ceil(targetDays / per[j]);
  return { massG, achievable: massG <= 5000 };
}
