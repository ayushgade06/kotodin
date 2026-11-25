import { describe, expect, it } from 'vitest';
import {
  FE_RHA_LITERATURE as P, addDays, calibrate, dailyLoadMg, decodeCard, designLabSweep, diffDays, encodeCard,
  findMassForTarget, forecastPouch, haversineKm, langmuirQe, makeCustomPreset, median, nearestWells,
  pouchCapacityMg, stockForecast, todayISO, toDayNumber, visitQueue, binIndex,
  type CardPayload, type FilterRow, type ForecastInput, type Well,
} from './index';

const base: ForecastInput = { c0: 150, litresPerDay: 25, massG: 250, media: P, installedOn: '2026-11-01', today: '2026-11-01' };
const fc = (o: Partial<ForecastInput> = {}) => forecastPouch({ ...base, ...o });

describe('model', () => {
  it('golden value: 250 g, qmax 6.32, b 2, C0 150, derate .5, fBT .5 → 24.3 days', () => {
    expect(langmuirQe(6.32, 2, 0.15)).toBeCloseTo(1.4585, 3);
    expect(pouchCapacityMg(P, 'mid', 250, 150)).toBeCloseTo(91.15, 1);
    expect(dailyLoadMg(150, 25)).toBeCloseTo(3.75, 6);
    expect(fc().days!.mid).toBeCloseTo(24.3, 1);
  });

  it('low band matches a hand calculation', () => {
    // qe = 2.24·0.3/1.3 = 0.51692; Q = 250·0.51692·0.3·0.5 = 19.385; D = 19.385/3.75 = 5.17
    expect(fc().days!.low).toBeCloseTo(5.17, 1);
  });

  it('bands are ordered low ≤ mid ≤ high', () => {
    for (const c0 of [11, 50, 180, 500, 2000]) {
      const d = fc({ c0 }).days!;
      expect(d.low).toBeLessThanOrEqual(d.mid);
      expect(d.mid).toBeLessThanOrEqual(d.high);
    }
  });

  it('more mass → more days', () => expect(fc({ massG: 500 }).days!.mid).toBeGreaterThan(fc().days!.mid));
  it('higher C0 → fewer days', () => expect(fc({ c0: 300 }).days!.mid).toBeLessThan(fc().days!.mid));
  it('more litres → fewer days', () => expect(fc({ litresPerDay: 40 }).days!.mid).toBeLessThan(fc().days!.mid));
  it('k scales days linearly', () => expect(fc({ k: 0.5 }).days!.mid).toBeCloseTo(fc().days!.mid * 0.5, 9));

  it('C0 ≤ 10 → not_needed; null → unknown_influent', () => {
    expect(fc({ c0: 10 }).status).toBe('not_needed');
    expect(fc({ c0: 3 }).replaceBy).toBeNull();
    expect(fc({ c0: null }).status).toBe('unknown_influent');
  });

  it('replace-by = install + floor(D_low); statuses follow conservative days left', () => {
    const f = fc({ massG: 1000 }); // D_low ≈ 20.7
    expect(f.replaceBy).toBe(addDays('2026-11-01', 20));
    expect(f.status).toBe('ok');
    expect(fc({ massG: 1000, today: '2026-11-15' }).status).toBe('due'); // 6 left
    expect(fc({ massG: 1000, today: '2026-11-21' }).status).toBe('overdue'); // 0 left
  });

  it('tests dated after today are ignored', () => {
    expect(fc({ massG: 1000, effluentTests: [{ date: '2026-11-03', asUgL: 14 }] }).status).toBe('ok');
  });

  it('failed override uses tests on/after install only', () => {
    const f = fc({ massG: 1000, today: '2026-11-05', effluentTests: [{ date: '2026-10-20', asUgL: 50 }, { date: '2026-11-04', asUgL: 9 }] });
    expect(f.status).toBe('ok');
    const g = fc({ massG: 1000, today: '2026-11-05', effluentTests: [{ date: '2026-11-04', asUgL: 12 }] });
    expect(g.status).toBe('failed');
    expect(g.failedTest).toEqual({ date: '2026-11-04', asUgL: 12 });
  });

  it('invalid input throws RangeError', () => {
    expect(() => fc({ c0: 5000 })).toThrow(RangeError);
    expect(() => fc({ litresPerDay: 0 })).toThrow(RangeError);
    expect(() => fc({ massG: 5 })).toThrow(RangeError);
    expect(() => fc({ installedOn: '2026-13-01' })).toThrow(RangeError);
    expect(() => makeCustomPreset({ qmax: [5, 1, 9], b: 2, derate: [0.3, 0.5, 0.8], fBT: 0.5, pouchCostBDT: 100 })).toThrow(RangeError);
  });
});

describe('dates', () => {
  it('UTC day maths is timezone-proof', () => {
    expect(diffDays('2026-12-01', '2026-11-25')).toBe(6);
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
    expect(toDayNumber('1970-01-02')).toBe(1);
    expect(todayISO(new Date(2026, 10, 5, 23, 30))).toBe('2026-11-05');
  });
});

describe('calibrate', () => {
  const obs = (r: number) => ({ filterId: 'f', daysToBreakthrough: 10, dailyLoadMg: r, qMidUncalibratedMg: 10 });
  it('fewer than 3 observations → k = 1', () => {
    const c = calibrate([obs(0.7), obs(0.8)]);
    expect(c.k).toBe(1);
    expect(c.n).toBe(2);
    expect(c.needed).toBe(3);
  });
  it('k = median of ratios', () => expect(calibrate([obs(0.5), obs(0.72), obs(0.9)]).k).toBeCloseTo(0.72, 9));
  it('k is clamped to [0.2, 2.0]', () => {
    expect(calibrate([obs(0.1), obs(0.1), obs(0.1)]).k).toBe(0.2);
    const c = calibrate([obs(3), obs(4), obs(5)]);
    expect(c.k).toBe(2);
    expect(c.clamped).toBe(true);
  });
  it('median of even-length lists averages the middle pair', () => expect(median([1, 2, 3, 4])).toBe(2.5));
});

const row = (code: string, c0: number, members: number, o: Partial<ForecastInput> = {}): FilterRow => ({
  householdId: code, code, members, c0, pouchCostBDT: 150,
  forecast: forecastPouch({ ...base, c0, massG: 1000, litresPerDay: members * 5, ...o }),
});

describe('visitQueue', () => {
  it('includes failed/overdue/due only, sorted by exposure × urgency', () => {
    const rows = [
      row('HH-001', 100, 4, { today: '2026-11-02' }), // ok
      row('HH-002', 100, 4, { today: '2026-12-30' }), // overdue (long)
      row('HH-003', 400, 6, { installedOn: '2026-11-01', today: '2026-11-09' }), // due-ish
      row('HH-004', 50, 2, { today: '2026-11-05', effluentTests: [{ date: '2026-11-04', asUgL: 20 }] }), // failed
    ];
    const q = visitQueue(rows, '2026-11-25');
    expect(q.map(i => i.row.code)).not.toContain('HH-001');
    for (let i = 1; i < q.length; i++) expect(q[i - 1].priority).toBeGreaterThanOrEqual(q[i].priority);
    const failed = q.find(i => i.status === 'failed')!;
    expect(failed.urgency).toBe(3);
    expect(failed.priority).toBeCloseTo((50 / 10) * 2 * 3, 9);
  });
  it('overdue urgency caps at 3 after 30 days', () => {
    const q = visitQueue([row('HH-009', 100, 4, { today: '2027-06-01' })]);
    expect(q[0].urgency).toBe(3);
  });
});

describe('stockForecast', () => {
  it('counts replacement cycles inside the horizon', () => {
    const r = row('HH-001', 150, 5, { today: '2026-11-01' }); // D_low ≈ 20.7 → cycle 20, first in 20 days
    expect(stockForecast([r], '2026-11-01', 30).pouches).toBe(1);
    expect(stockForecast([r], '2026-11-01', 60).pouches).toBe(3); // day 20, 40, 60
    expect(stockForecast([r], '2026-11-01', 10).pouches).toBe(0);
    expect(stockForecast([r], '2026-11-01', 60).costBDT).toBe(450);
  });
});

const W = (id: string, lat: number, lon: number, asUgL: number): Well => ({ id, lat, lon, asUgL, district: 'D', upazila: 'U', depthM: 20 });

describe('geo', () => {
  it('haversine: 1° latitude ≈ 111 km', () => expect(haversineKm(23, 90, 24, 90)).toBeCloseTo(111.2, 0));
  it('nearestWells respects radius and k, returns median', () => {
    const wells = [W('a', 23.7, 90.6, 100), W('b', 23.71, 90.6, 200), W('c', 23.72, 90.6, 300), W('far', 24.5, 90.6, 900)];
    const r = nearestWells(wells, 23.7, 90.6, 5, 5);
    expect(r.wells.map(w => w.id)).toEqual(['a', 'b', 'c']);
    expect(r.medianAs).toBe(200);
    expect(nearestWells(wells, 23.7, 90.6, 5, 2).wells).toHaveLength(2);
    expect(nearestWells(wells, 20, 88).medianAs).toBeNull();
  });
});

const card: CardPayload = {
  v: 1, code: 'HH-014', c0: 175, lpd: 30, m: 1000,
  p: { qmax: [2.24, 6.32, 12], b: 2, derate: [0.3, 0.5, 0.8], fbt: 0.5 }, k: 0.7234, i: '2026-11-04', lang: 'bn',
};

describe('card codec', () => {
  it('round-trips and stays short enough for a 3 cm QR', () => {
    const s = encodeCard(card);
    expect(s.length).toBeLessThan(350);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeCard(s)).toEqual({ ...card, k: 0.723 });
  });
  it('rejects tampered or malformed payloads', () => {
    const s = encodeCard(card);
    expect(decodeCard(s.slice(0, -6) + 'AAAAAA')).toBeNull();
    expect(decodeCard('not-base64!!')).toBeNull();
    const bad = btoa(JSON.stringify({ ...card, c0: 99999 }));
    expect(decodeCard(bad)).toBeNull();
    expect(decodeCard(btoa(JSON.stringify({ ...card, code: '<script>' })))).toBeNull();
  });
});

describe('design lab', () => {
  const synthetic = Array.from({ length: 3500 }, (_, i) => W(`w${i}`, 23 + (i % 50) / 100, 90 + i / 3500, (i * 37) % 600));
  it('sweeps 3.5k wells in < 50 ms', () => {
    designLabSweep(synthetic, P, 250, 5, 5); // warm-up
    const t = performance.now();
    designLabSweep(synthetic, P, 250, 5, 5);
    expect(performance.now() - t).toBeLessThan(50);
  });
  it('bins, not-needed count and per-well days agree with forecastPouch', () => {
    const wells = [W('a', 0, 0, 5), W('b', 0, 0, 150), W('c', 0, 0, 400)];
    const r = designLabSweep(wells, P, 250, 5, 5);
    expect(r.notNeeded).toBe(1);
    expect(r.analysed).toBe(2);
    expect(r.dMid[1]).toBeCloseTo(24.3, 1);
    expect(Number.isNaN(r.dMid[0])).toBe(true);
    expect(r.mid.bins.reduce((a, b) => a + b, 0)).toBe(2);
    expect(r.mid.pctUnder30).toBe(100);
  });
  it('binIndex edges', () => {
    expect(binIndex(7)).toBe(0);
    expect(binIndex(7.01)).toBe(1);
    expect(binIndex(365)).toBe(6);
    expect(binIndex(366)).toBe(7);
  });
  it('findMassForTarget returns the smallest mass meeting the share', () => {
    const res = findMassForTarget(synthetic, P, 5, 5, 30, 0.9)!;
    const ok = (m: number) => {
      const r = designLabSweep(synthetic, P, Math.min(m, 5000), 5, 5);
      let n = 0; for (const d of r.dMid) if (!Number.isNaN(d) && d >= 30) n++;
      return n / r.analysed;
    };
    if (res.achievable) {
      expect(ok(res.massG)).toBeGreaterThanOrEqual(0.9);
      expect(ok(res.massG - 2)).toBeLessThan(0.9);
    }
    expect(findMassForTarget([W('a', 0, 0, 1)], P, 5, 5)).toBeNull();
  });
});
