import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'csv-parse/sync';
import { buildDemoProgram, DEMO_HERO, TARGET_MIX } from '../seed/demoProgram';
import { derive } from './derive';
import { exportJson, importJson, isProgramState, loadState, saveState, STORAGE_KEY } from './store';
import { isWellsFile, packWells, parseConc, rowsToWells, unpackWells, type RawRow } from '../data/parseWells';
import { addDays, visitQueue, type Status } from '../engine';

const wells = unpackWells(JSON.parse(readFileSync('public/data/wells.json', 'utf8')));
const TODAY = '2026-11-25';

describe('wells parser', () => {
  const csv = `title,,,
x,,,
y,,,
z,,,
SAMPLE_ID,LAT_DEG,LONG_DEG,WELL_DEPTH,DISTRICT,THANA,As
,,,m,,,ug/l
S1,23.12346,90.5,20,Dhaka,Savar,13
S2,23.2,90.6,30,Dhaka,Savar,< 6
S3,,90.7,40,Dhaka,Savar,50
S4,23.4,90.8,,Dhaka,Savar,
S5,23.5,90.9,280,Feni,Sonagazi,< 0.5`;
  const rows = parse(csv, { from_line: 5, columns: true, relax_column_count: true, skip_empty_lines: true }) as RawRow[];
  const { wells: ws, dropped } = rowsToWells(rows);

  it('handles below-detection, missing coordinates and missing arsenic', () => {
    expect(parseConc('< 6')).toBe(3);
    expect(parseConc('')).toBeNull();
    expect(ws.map(w => [w.id, w.asUgL])).toEqual([['S1', 13], ['S2', 3], ['S5', 0.25]]);
    expect(dropped).toEqual({ noArsenic: 1, noCoords: 1 });
    expect(ws[0].lat).toBe(23.1235);
  });
  it('pack/unpack round-trips and the guard rejects junk', () => {
    expect(unpackWells(packWells(ws))).toEqual(ws);
    expect(isWellsFile({ v: 1, districts: [], upazilas: [], rows: [['x']] })).toBe(false);
    expect(() => unpackWells({})).toThrow();
  });
  it('real survey file: 3,000–3,600 wells', () => expect(wells.length).toBeGreaterThanOrEqual(3000));
});

describe('demo seed', () => {
  const a = buildDemoProgram(wells, TODAY);
  it('is deterministic', () => expect(JSON.stringify(buildDemoProgram(wells, TODAY))).toBe(JSON.stringify(a)));
  it('is a valid ProgramState of 40 households', () => {
    expect(isProgramState(a)).toBe(true);
    expect(a.households).toHaveLength(40);
  });
  it('opens with the target status mix (±2)', () => {
    const count: Partial<Record<Status, number>> = {};
    for (const r of derive(a, TODAY).rows) count[r.forecast.status] = (count[r.forecast.status] ?? 0) + 1;
    const target = { ok: TARGET_MIX.ok + TARGET_MIX.ok_border, due: TARGET_MIX.due, overdue: TARGET_MIX.overdue, failed: TARGET_MIX.failed, not_needed: TARGET_MIX.not_needed };
    for (const [s, n] of Object.entries(target)) expect(Math.abs((count[s as Status] ?? 0) - n)).toBeLessThanOrEqual(2);
  });
  it('has 2 of 3 breakthroughs needed, so k = 1', () => {
    const d = derive(a, TODAY);
    expect(d.calibration.n).toBe(2);
    expect(d.calibration.k).toBe(1);
  });
  it('demo action: a failing effluent test on HH-014 recalibrates k and moves ≥ 2 households into the queue', () => {
    const before = derive(a, TODAY);
    const hero = before.rows.find(r => r.code === DEMO_HERO)!;
    expect(hero.household.members).toBe(6);
    expect(hero.forecast.status).toBe('overdue');
    const after = derive({ ...a, tests: [...a.tests, { id: 'x', filterId: hero.filter.id, date: TODAY, kind: 'effluent', asUgL: 14 }] }, TODAY);
    expect(after.calibration.n).toBe(3);
    expect(after.calibration.k).toBeGreaterThan(0.6);
    expect(after.calibration.k).toBeLessThan(0.8);
    expect(visitQueue(after.rows).length - visitQueue(before.rows).length).toBeGreaterThanOrEqual(2);
  });
  it('the same works whichever household gets the third failing test', () => {
    const before = derive(a, TODAY);
    const other = before.rows.find(r => r.forecast.status === "ok" && r.forecast.daysElapsed > 0)!;
    const after = derive({ ...a, tests: [...a.tests, { id: 'x', filterId: other.filter.id, date: TODAY, kind: 'effluent', asUgL: 20 }] }, TODAY);
    expect(after.calibration.k).toBeGreaterThan(0.6);
    expect(after.calibration.k).toBeLessThan(0.8);
  });
  it('replacing the pouch resets status to ok', () => {
    const hero = derive(a, TODAY).rows.find(r => r.code === DEMO_HERO)!;
    const s = { ...a, pouches: [...a.pouches, { id: 'pn', filterId: hero.filter.id, installedOn: TODAY }] };
    expect(derive(s, TODAY).byHousehold.get(hero.householdId)!.forecast.status).toBe('ok');
    expect(derive(s, addDays(TODAY, 1)).byHousehold.get(hero.householdId)!.pouches).toHaveLength(2);
  });
  it('contains no names or personal fields', () => {
    for (const h of a.households) expect(Object.keys(h).sort()).toEqual(['code', 'createdAt', 'id', 'influentAsUgL', 'influentSource', 'lat', 'litresPerDay', 'lon', 'members']);
  });
});

describe('store', () => {
  const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }; };
  const s = buildDemoProgram(wells, TODAY);
  it('save → load round-trips', () => {
    const st = mem();
    saveState(s, st);
    expect(loadState(st)).toEqual({ state: s, corrupt: false });
  });
  it('corrupt storage is reported, not thrown', () => {
    const st = mem();
    st.setItem(STORAGE_KEY, '{oops');
    expect(loadState(st)).toEqual({ state: null, corrupt: true });
    st.setItem(STORAGE_KEY, JSON.stringify({ ...s, version: 2 }));
    expect(loadState(st).corrupt).toBe(true);
  });
  it('export → import round-trips; bad files are rejected with a message', () => {
    expect(importJson(exportJson(s))).toEqual(s);
    expect(() => importJson('nope')).toThrow(/not valid JSON/);
    expect(() => importJson('{"version":1}')).toThrow(/not a Kotodin/);
  });
});
