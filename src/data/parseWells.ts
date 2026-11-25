// Pure parser for the DPHE/BGS National Hydrochemical Survey CSV (release 25 May 2000).
// Shared by scripts/build-wells.ts (build time) and unit tests.
import type { Well } from '../engine/types';

export interface RawRow { [col: string]: string | undefined }

/** "< 6" → 3 (half the detection limit), "13" → 13, "" → null. */
export function parseConc(v: string | undefined): number | null {
  if (v == null) return null;
  const s = v.trim();
  if (s === '') return null;
  const lt = /^<\s*([0-9.]+)$/.exec(s);
  if (lt) return Number(lt[1]) / 2;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;

export interface ParseResult { wells: Well[]; dropped: { noArsenic: number; noCoords: number } }

export function rowsToWells(rows: RawRow[]): ParseResult {
  const wells: Well[] = [];
  const dropped = { noArsenic: 0, noCoords: 0 };
  for (const r of rows) {
    if (!r.SAMPLE_ID || r.SAMPLE_ID.trim() === '') continue; // units row / blank
    const as = parseConc(r.As);
    if (as == null) { dropped.noArsenic++; continue; }
    const lat = parseConc(r.LAT_DEG), lon = parseConc(r.LONG_DEG);
    if (lat == null || lon == null || lat === 0 || lon === 0) { dropped.noCoords++; continue; }
    const depth = parseConc(r.WELL_DEPTH);
    wells.push({
      id: r.SAMPLE_ID.trim(),
      lat: round(lat, 4),
      lon: round(lon, 4),
      district: (r.DISTRICT ?? '').trim(),
      upazila: (r.THANA ?? '').trim(),
      depthM: depth,
      asUgL: as,
    });
  }
  return { wells, dropped };
}

/** Compact columnar format written to public/data/wells.json (keeps the file small). */
export interface WellsFile {
  v: 1;
  districts: string[];
  upazilas: string[];
  /** [id, lat, lon, districtIdx, upazilaIdx, depthM|null, asUgL] */
  rows: [string, number, number, number, number, number | null, number][];
}

export function packWells(wells: Well[]): WellsFile {
  const districts: string[] = [], upazilas: string[] = [];
  const idx = (arr: string[], s: string) => { let i = arr.indexOf(s); if (i < 0) { i = arr.length; arr.push(s); } return i; };
  return {
    v: 1, districts, upazilas,
    rows: wells.map(w => [w.id, w.lat, w.lon, idx(districts, w.district), idx(upazilas, w.upazila), w.depthM, w.asUgL]),
  };
}

export function unpackWells(f: unknown): Well[] {
  if (!isWellsFile(f)) throw new Error('wells.json has an unexpected format');
  return f.rows.map(([id, lat, lon, d, u, depthM, asUgL]) => ({
    id, lat, lon, district: f.districts[d] ?? '', upazila: f.upazilas[u] ?? '', depthM, asUgL,
  }));
}

export function isWellsFile(f: unknown): f is WellsFile {
  if (typeof f !== 'object' || f === null) return false;
  const o = f as Partial<WellsFile>;
  return o.v === 1 && Array.isArray(o.districts) && Array.isArray(o.upazilas) && Array.isArray(o.rows) &&
    o.rows.every(r => Array.isArray(r) && r.length === 7 && typeof r[0] === 'string' &&
      typeof r[1] === 'number' && typeof r[2] === 'number' && typeof r[6] === 'number');
}
