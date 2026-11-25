// Pure selectors: everything shown in the program UI is recomputed from state + today. Nothing derived is stored.
import {
  calibrate, dailyLoadMg, diffDays, forecastPouch, pouchCapacityMg, FE_RHA_LITERATURE,
  type BreakthroughObservation, type Calibration, type FilterRow, type Filter, type Household,
  type MediaParams, type PouchEvent, type ProgramState, type WaterTest,
} from '../engine';

export interface HouseholdRow extends FilterRow {
  household: Household;
  filter: Filter;
  pouch: PouchEvent;
  pouches: PouchEvent[]; // oldest → newest
  tests: WaterTest[]; // newest first
}

export interface Derived {
  media: MediaParams;
  calibration: Calibration;
  observations: BreakthroughObservation[];
  rows: HouseholdRow[];
  byHousehold: Map<string, HouseholdRow>;
}

export const programMedia = (s: ProgramState): MediaParams =>
  s.media.find(m => m.id === s.program.mediaId) ?? FE_RHA_LITERATURE;

/** One observation per pouch whose first failing effluent test happened while it was installed. */
export function breakthroughObservations(s: ProgramState, today: string): BreakthroughObservation[] {
  const media = programMedia(s);
  const out: BreakthroughObservation[] = [];
  for (const f of s.filters) {
    const h = s.households.find(x => x.id === f.householdId);
    if (!h || h.influentAsUgL == null || h.influentAsUgL <= s.program.targetUgL) continue;
    const pouches = s.pouches.filter(p => p.filterId === f.id).sort((a, b) => diffDays(a.installedOn, b.installedOn));
    pouches.forEach((p, i) => {
      const end = pouches[i + 1]?.installedOn ?? today;
      const fail = s.tests
        .filter(t => t.filterId === f.id && t.kind === 'effluent' && t.asUgL >= s.program.targetUgL &&
          diffDays(t.date, p.installedOn) >= 0 && diffDays(end, t.date) >= 0 && diffDays(today, t.date) >= 0)
        .sort((a, b) => diffDays(a.date, b.date))[0];
      if (!fail) return;
      out.push({
        filterId: f.id,
        daysToBreakthrough: diffDays(fail.date, p.installedOn),
        dailyLoadMg: dailyLoadMg(h.influentAsUgL!, h.litresPerDay),
        qMidUncalibratedMg: pouchCapacityMg(media, 'mid', f.pouchMassG, h.influentAsUgL!, 1),
      });
    });
  }
  return out;
}

export function derive(s: ProgramState, today: string): Derived {
  const media = programMedia(s);
  const observations = breakthroughObservations(s, today);
  const calibration = calibrate(observations);
  const rows: HouseholdRow[] = [];
  for (const h of s.households) {
    const filter = s.filters.find(f => f.householdId === h.id);
    if (!filter) continue;
    const pouches = s.pouches.filter(p => p.filterId === filter.id).sort((a, b) => diffDays(a.installedOn, b.installedOn));
    const pouch = pouches[pouches.length - 1];
    if (!pouch) continue;
    const tests = s.tests.filter(t => t.filterId === filter.id).sort((a, b) => diffDays(b.date, a.date));
    const forecast = forecastPouch({
      c0: h.influentAsUgL, litresPerDay: h.litresPerDay, massG: filter.pouchMassG, media,
      k: calibration.k, installedOn: pouch.installedOn, today, targetUgL: s.program.targetUgL,
      effluentTests: tests.filter(t => t.kind === 'effluent'),
    });
    rows.push({ householdId: h.id, code: h.code, members: h.members, c0: h.influentAsUgL, pouchCostBDT: media.pouchCostBDT, forecast, household: h, filter, pouch, pouches, tests });
  }
  rows.sort((a, b) => a.code.localeCompare(b.code));
  return { media, calibration, observations, rows, byHousehold: new Map(rows.map(r => [r.householdId, r])) };
}
