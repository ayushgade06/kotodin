import type { FilterRow as HouseholdRowLike, Forecast } from '../engine';

export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
};
export const fmtShort = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
};
export const fmtNum = (n: number, d = 0) => new Intl.NumberFormat('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);
export const fmtBDT = (n: number) => `৳${fmtNum(Math.round(n))}`;
export const plural = (n: number, one: string, many = `${one}s`) => `${fmtNum(n)} ${n === 1 ? one : many}`;

/** Plain-language reason a household is in (or out of) the visit queue. */
export function whyLine(r: HouseholdRowLike): string {
  const f: Forecast = r.forecast;
  const exposure = `${r.c0 != null ? `${fmtNum(r.c0)} µg/L well` : 'well not tested'} · ${plural(r.members, 'person', 'people')}`;
  const low = f.daysLeft?.low;
  switch (f.status) {
    case 'failed': return `Breakthrough: ${fmtNum(f.failedTest!.asUgL)} µg/L on ${fmtShort(f.failedTest!.date)} · ${exposure}`;
    case 'overdue': return `${low === 0 ? 'Replace today' : `Overdue ${plural(-(low ?? 0), 'day')}`} · ${exposure}`;
    case 'due': return `Due in ${plural(low ?? 0, 'day')} · ${exposure}`;
    case 'ok': return `${plural(low ?? 0, 'day')} left (cautious) · ${exposure}`;
    case 'not_needed': return `Well ≤ 10 µg/L · no arsenic filter needed`;
    default: return 'Influent not tested · test the well to forecast';
  }
}

/** Remaining capacity fraction on the cautious band (for the fill-glass icon). */
export const remainingLow = (f: Forecast) => (f.days ? Math.max(0, 1 - f.daysElapsed / f.days.low) : f.status === 'not_needed' ? 1 : 0);
