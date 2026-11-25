import type { FilterRow } from './queue';

export interface StockForecast { horizonDays: number; pouches: number; costBDT: number; filters: number }

/**
 * Pouches needed within the horizon, replacing every filter on its conservative (low-band) cycle.
 * First replacement: today if failed/overdue, else in daysLeft.low days; then every floor(days.low) days.
 */
export function stockForecast(rows: FilterRow[], _today: string, horizonDays: number): StockForecast {
  if (!(horizonDays >= 0)) throw new RangeError('horizonDays must be ≥ 0');
  let pouches = 0, costBDT = 0, filters = 0;
  for (const r of rows) {
    const f = r.forecast;
    if (f.status === 'not_needed' || f.status === 'unknown_influent') continue;
    if (!f.days || !f.daysLeft) { pouches++; costBDT += r.pouchCostBDT; filters++; continue; } // failed, no influent value
    const cycle = Math.max(1, Math.floor(f.days.low));
    const first = f.status === 'failed' ? 0 : Math.max(0, f.daysLeft.low);
    if (first > horizonDays) continue;
    const n = 1 + Math.floor((horizonDays - first) / cycle);
    pouches += n; costBDT += n * r.pouchCostBDT; filters++;
  }
  return { horizonDays, pouches, costBDT, filters };
}
