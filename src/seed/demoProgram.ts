// Demo program: 40 SYNTHETIC households placed on REAL DPHE/BGS survey wells around Sonargaon (Narayanganj).
// Install dates are synthetic and chosen so the dashboard opens with a realistic status mix, and so that
// adding one more failing field test (the demo action) recalibrates the fleet.
import {
  FE_RHA_LITERATURE, addDays, dailyLoadMg, haversineKm, nearestWells, pouchCapacityMg,
  type Household, type ProgramState, type Status, type WaterTest, type Well,
} from '../engine';

export const DEMO_SEED = 20261125;
export const DEMO_CENTRE = { lat: 23.66, lon: 90.61, radiusKm: 18, name: 'Sonargaon' };
export const DEMO_POUCH_G = 1000;
export const DEMO_HERO = 'HH-014';

/** mulberry32: tiny deterministic PRNG. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Target = Exclude<Status, 'unknown_influent'> | 'ok_border';
export const TARGET_MIX: Record<Target, number> = { ok: 22, ok_border: 3, due: 6, overdue: 5, failed: 2, not_needed: 2 };
const FAIL_RATIOS = [0.7, 0.74]; // pre-seeded breakthroughs: pouches lasted ~70–74% of the lab mid estimate

export function buildDemoProgram(allWells: Well[], today: string): ProgramState {
  const rng = mulberry32(DEMO_SEED);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];
  const int = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
  const media = FE_RHA_LITERATURE;

  const pool = allWells.filter(w => haversineKm(DEMO_CENTRE.lat, DEMO_CENTRE.lon, w.lat, w.lon) <= DEMO_CENTRE.radiusKm);
  const high = pool.filter(w => w.asUgL > 10 && w.asUgL <= 600);
  const low = pool.filter(w => w.asUgL <= 10);
  if (high.length < 5 || low.length < 1) throw new Error('Not enough survey wells near the demo centre');

  // Status targets, shuffled deterministically; HH-014 is the demo hero (overdue, ~180 µg/L, 6 people).
  const targets: Target[] = (Object.entries(TARGET_MIX) as [Target, number][]).flatMap(([t, n]) => Array(n).fill(t));
  const heroIdx = 13;
  targets.splice(targets.indexOf('overdue'), 1);
  for (let i = targets.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [targets[i], targets[j]] = [targets[j], targets[i]]; }
  targets.splice(heroIdx, 0, 'overdue');

  const s: ProgramState = {
    version: 1,
    program: { id: 'demo', name: `Demo pilot: ${DEMO_CENTRE.name} (synthetic)`, isDemo: true, mediaId: media.id, targetUgL: 10 },
    media: [media],
    households: [], filters: [], pouches: [], tests: [],
  };
  let failIdx = 0;
  // Spread households across the available wells: prefer the least-used wells for the first tries.
  const uses = new Map<string, number>();
  const pickFresh = (xs: Well[], attempt: number) => {
    if (attempt >= 60) return pick(xs);
    const min = Math.min(...xs.map(w => uses.get(w.id) ?? 0));
    return pick(xs.filter(w => (uses.get(w.id) ?? 0) === min));
  };

  targets.forEach((target, i) => {
    const code = `HH-${String(i + 1).padStart(3, '0')}`;
    const isHero = i === heroIdx;
    for (let attempt = 0; attempt < 200; attempt++) {
      const well = isHero
        ? [...high].sort((a, b) => Math.abs(a.asUgL - 180) - Math.abs(b.asUgL - 180))[0]
        : pickFresh(target === 'not_needed' ? low : high, attempt);
      const members = isHero ? 6 : int(2, 8);
      const lpd = members * 5;
      const lat = +(well.lat + (rng() - 0.5) * 0.0054).toFixed(5); // ±300 m jitter
      const lon = +(well.lon + (rng() - 0.5) * 0.0058).toFixed(5);
      let source: Household['influentSource'] = isHero || rng() < 0.7 ? 'field_test' : 'bgs_nearest';
      let c0 = well.asUgL;
      if (source === 'bgs_nearest') {
        const est = nearestWells(allWells, lat, lon, 5, 5).medianAs;
        if (est != null && (target === 'not_needed' ? est <= 10 : est > 10 && est <= 600)) c0 = Math.round(est);
        else source = 'field_test';
      }
      const dLow = target === 'not_needed' ? 0 : pouchCapacityMg(media, 'low', DEMO_POUCH_G, c0) / dailyLoadMg(c0, lpd);
      const dMid = target === 'not_needed' ? 0 : pouchCapacityMg(media, 'mid', DEMO_POUCH_G, c0) / dailyLoadMg(c0, lpd);
      const fl = Math.floor(dLow);

      // Choose pouch age (days since install) so the forecast lands in the target status.
      let age: number | null = null;
      let failDay: number | null = null;
      if (target === 'not_needed') age = int(10, 120);
      else if (isHero) age = fl + 5; // overdue by 5 days
      else if (target === 'ok') {
        const lo = Math.ceil(7 + 0.36 * dLow) + 1; // stays ok even after k drops to ~0.64
        if (lo <= fl) age = fl - int(lo, fl);
      } else if (target === 'ok_border') {
        const hi = Math.floor(7 + 0.24 * dLow); // flips to "due" once k ≈ 0.70–0.74
        if (hi >= 8) age = fl - int(8, hi);
      } else if (target === 'due') age = fl - int(1, 7);
      else if (target === 'overdue') age = fl + int(0, 20);
      else if (target === 'failed') {
        failDay = Math.round(FAIL_RATIOS[failIdx] * dMid);
        age = failDay + int(1, 6);
      }
      if (age == null || age < 0 || age > 120) continue;

      uses.set(well.id, (uses.get(well.id) ?? 0) + 1);
      const installedOn = addDays(today, -age);
      const id = `h${i + 1}`, fid = `f${i + 1}`;
      s.households.push({ id, code, lat, lon, members, litresPerDay: lpd, influentAsUgL: c0, influentSource: source, createdAt: installedOn });
      s.filters.push({ id: fid, householdId: id, mediaId: media.id, pouchMassG: DEMO_POUCH_G });
      s.pouches.push({ id: `p${i + 1}`, filterId: fid, installedOn });
      const tests: WaterTest[] = [];
      if (source === 'field_test') tests.push({ id: `t${i + 1}i`, filterId: fid, date: installedOn, kind: 'influent', asUgL: c0, kit: 'Field kit (demo)' });
      if (failDay != null) {
        failIdx++;
        if (failDay > 14) tests.push({ id: `t${i + 1}p`, filterId: fid, date: addDays(installedOn, Math.floor(failDay / 2)), kind: 'effluent', asUgL: int(1, 4), kit: 'Field kit (demo)' });
        tests.push({ id: `t${i + 1}e`, filterId: fid, date: addDays(installedOn, failDay), kind: 'effluent', asUgL: int(12, 30), kit: 'Field kit (demo)' });
      }
      s.tests.push(...tests);
      return;
    }
    throw new Error(`Could not place ${code} as ${target}`);
  });
  return s;
}
