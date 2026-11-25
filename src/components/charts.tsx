import { useState } from 'react';
import { BIN_LABELS, type Forecast, type WaterTest } from '../engine';
import { cx } from './ui';

/** Remaining pouch capacity (%) over time for the low / mid / high bands, with today and test markers. */
export function CapacityCurve({ f, tests, installedOn }: { f: Forecast; tests: WaterTest[]; installedOn: string }) {
  if (!f.days) return null;
  const W = 640, H = 230, L = 40, R = 16, T = 14, B = 34;
  const span = Math.max(f.days.mid * 1.25, f.daysElapsed + 14, f.days.low + 14);
  const xMax = Math.min(span, f.days.high * 1.02);
  const x = (d: number) => L + (Math.min(d, xMax) / xMax) * (W - L - R);
  const y = (pct: number) => T + (1 - pct) * (H - T - B);
  const line = (D: number) => `M${x(0)},${y(1)} L${x(Math.min(D, xMax))},${y(Math.max(0, 1 - Math.min(D, xMax) / D))}${D <= xMax ? ` L${x(xMax)},${y(0)}` : ''}`;
  const remain = (D: number, t: number) => Math.max(0, 1 - t / D);
  const bandArea = `M${x(0)},${y(1)} L${x(xMax)},${y(remain(f.days.high, xMax))} L${x(xMax)},${y(remain(f.days.low, xMax))} ${f.days.low < xMax ? `L${x(f.days.low)},${y(0)}` : ''} Z`;
  const ticks = niceTicks(xMax);
  const effl = tests.filter(t => t.kind === 'effluent');
  const dayOf = (d: string) => (Date.parse(d) - Date.parse(installedOn)) / 86_400_000;
  const tToday = f.daysElapsed;
  const summary = `Remaining capacity falls to zero after ${Math.floor(f.days.low)} days (cautious), ${Math.floor(f.days.mid)} days (central) or ${Math.floor(f.days.high)} days (optimistic). Today is day ${tToday} since the pouch was installed on ${installedOn}.`;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={summary}>
        {[0, 0.5, 1].map(p => (
          <g key={p}>
            <line x1={L} x2={W - R} y1={y(p)} y2={y(p)} stroke="#E2DDD2" strokeDasharray={p === 0 ? undefined : '2 4'} />
            <text x={L - 8} y={y(p) + 4} textAnchor="end" fontSize="11" fill="#5F6873" className="tnum">{p * 100}%</text>
          </g>
        ))}
        {ticks.map(d => (
          <text key={d} x={x(d)} y={H - B + 18} textAnchor="middle" fontSize="11" fill="#5F6873" className="tnum">{d === 0 ? 'Install' : `day ${d}`}</text>
        ))}
        <path d={bandArea} fill="#1C6E8C" opacity="0.1" />
        <path d={line(f.days.high)} fill="none" stroke="#1C6E8C" strokeOpacity="0.45" strokeWidth="1.5" />
        <path d={line(f.days.mid)} fill="none" stroke="#1C6E8C" strokeWidth="2.25" />
        <path d={line(f.days.low)} fill="none" stroke="#B42318" strokeWidth="2" strokeDasharray="6 4" />
        {f.days.low <= xMax && (
          <g>
            <circle cx={x(f.days.low)} cy={y(0)} r="4" fill="#B42318" />
            <text x={x(f.days.low) + 6} y={y(0) - 8} fontSize="11" fill="#B42318" fontWeight="600">replace by</text>
          </g>
        )}
        {tToday >= 0 && tToday <= xMax && (
          <g>
            <line x1={x(tToday)} x2={x(tToday)} y1={T - 4} y2={H - B} stroke="#0F1B24" strokeWidth="1.25" />
            <rect x={x(tToday) - 22} y={T - 12} width="44" height="16" rx="4" fill="#0F1B24" />
            <text x={x(tToday)} y={T} textAnchor="middle" fontSize="10.5" fill="#F7F5F0" fontWeight="600">today</text>
          </g>
        )}
        {effl.map(t => {
          const d = dayOf(t.date);
          if (d < 0 || d > xMax) return null;
          const fail = t.asUgL >= 10;
          return <circle key={t.id} cx={x(d)} cy={y(0) - 1} r="5" fill={fail ? '#B42318' : '#2E7D4F'} stroke="#fff" strokeWidth="1.5"><title>{`Effluent test ${t.date}: ${t.asUgL} µg/L`}</title></circle>;
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <Legend swatch={<span className="block w-5 border-t-2 border-dashed border-bad" />}>Cautious (low) — used for “replace by”</Legend>
        <Legend swatch={<span className="block w-5 border-t-[2.5px] border-water" />}>Central (mid)</Legend>
        <Legend swatch={<span className="block w-5 border-t-[1.5px] border-water/50" />}>Optimistic (high)</Legend>
        <Legend swatch={<span className="block size-2.5 rounded-full bg-ok" />}>Effluent test passed</Legend>
        <Legend swatch={<span className="block size-2.5 rounded-full bg-bad" />}>Failed (≥ 10 µg/L)</Legend>
      </figcaption>
    </figure>
  );
}

function Legend({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5">{swatch}{children}</span>;
}

function niceTicks(max: number): number[] {
  const step = [7, 14, 30, 60, 90, 180].find(s => max / s <= 6) ?? 365;
  const out: number[] = [];
  for (let d = 0; d <= max; d += step) out.push(d);
  return out;
}

export const BUCKET_COLORS = ['#9F1D14', '#C8452B', '#E08E3C', '#E3C063', '#A9C4B4', '#5E9FB0', '#1C6E8C', '#0F3E50'];

/** Histogram of days-to-breakthrough across wells, central vs cautious, with a data-table toggle. */
export function Histogram({ mid, low, basis }: { mid: number[]; low: number[]; basis: 'mid' | 'low' }) {
  const [table, setTable] = useState(false);
  const W = 640, H = 250, L = 8, R = 8, T = 22, B = 40;
  const max = Math.max(1, ...mid, ...low);
  const n = BIN_LABELS.length;
  const bw = (W - L - R) / n;
  const total = mid.reduce((a, b) => a + b, 0) || 1;
  const main = basis === 'mid' ? mid : low;
  const other = basis === 'mid' ? low : mid;
  const h = (v: number) => (v / max) * (H - T - B);
  return (
    <div>
      {!table ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
          aria-label={`Histogram of days until the pouch must be replaced across ${total} wells. ` + BIN_LABELS.map((l, i) => `${l} days: ${main[i]}`).join('; ')}>
          <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#CDC6B8" />
          {BIN_LABELS.map((label, i) => {
            const x0 = L + i * bw + 6, w = bw - 12;
            return (
              <g key={label}>
                <rect x={x0} y={H - B - h(other[i])} width={w} height={h(other[i])} fill="none" stroke="#5F6873" strokeOpacity="0.5" strokeDasharray="3 3" rx="3" />
                <rect x={x0 + 4} y={H - B - h(main[i])} width={w - 8} height={h(main[i])} fill={BUCKET_COLORS[i]} rx="3" style={{ transition: 'y 160ms ease-out, height 160ms ease-out' }} />
                <text x={x0 + w / 2} y={H - B - h(Math.max(main[i], other[i])) - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill="#0F1B24" className="tnum">{main[i]}</text>
                <text x={x0 + w / 2} y={H - B + 16} textAnchor="middle" fontSize="11.5" fill="#34424D" className="tnum">{label}</text>
                <text x={x0 + w / 2} y={H - B + 31} textAnchor="middle" fontSize="10.5" fill="#5F6873" className="tnum">{Math.round((100 * main[i]) / total)}%</text>
              </g>
            );
          })}
        </svg>
      ) : (
        <table className="w-full text-sm tnum">
          <caption className="sr-only">Wells per replacement-interval bin</caption>
          <thead><tr className="text-left text-muted"><th className="py-1.5 font-medium">Days</th><th className="font-medium">Central (mid)</th><th className="font-medium">Cautious (low)</th></tr></thead>
          <tbody>{BIN_LABELS.map((l, i) => <tr key={l} className="border-t border-line"><td className="py-1.5">{l}</td><td>{mid[i]}</td><td>{low[i]}</td></tr>)}</tbody>
        </table>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5"><span className="block h-2.5 w-4 rounded-sm bg-water" />{basis === 'mid' ? 'Central estimate' : 'Cautious estimate'}</span>
          <span className="inline-flex items-center gap-1.5"><span className="block h-2.5 w-4 rounded-sm border border-dashed border-muted" />{basis === 'mid' ? 'Cautious estimate' : 'Central estimate'}</span>
        </span>
        <button type="button" onClick={() => setTable(v => !v)} className={cx('underline underline-offset-4 decoration-line-strong hover:text-ink')} aria-pressed={table}>
          {table ? 'Show chart' : 'Show as table'}
        </button>
      </div>
    </div>
  );
}
