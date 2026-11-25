// Persistence: one versioned JSON blob in localStorage, validated on every load and import.
import { isISODate, validateMedia, type ProgramState } from '../engine';

export const STORAGE_KEY = 'kotodin:v1';

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === 'string' && x.length > 0;

export function isProgramState(x: unknown): x is ProgramState {
  if (!isObj(x) || x.version !== 1 || !isObj(x.program)) return false;
  const p = x.program;
  if (!isStr(p.id) || typeof p.name !== 'string' || typeof p.isDemo !== 'boolean' || !isStr(p.mediaId) || p.targetUgL !== 10) return false;
  const arrays = ['media', 'households', 'filters', 'pouches', 'tests'] as const;
  if (!arrays.every(k => Array.isArray(x[k]))) return false;
  const s = x as unknown as ProgramState;
  try { s.media.forEach(validateMedia); } catch { return false; }
  if (!s.media.some(m => m.id === s.program.mediaId)) return false;
  return (
    s.households.every(h => isObj(h) && isStr(h.id) && isStr(h.code) && isNum(h.lat) && isNum(h.lon) &&
      isNum(h.members) && isNum(h.litresPerDay) && (h.influentAsUgL === null || isNum(h.influentAsUgL)) &&
      ['field_test', 'bgs_nearest', 'unknown'].includes(h.influentSource) && isISODate(h.createdAt)) &&
    s.filters.every(f => isObj(f) && isStr(f.id) && isStr(f.householdId) && isStr(f.mediaId) && isNum(f.pouchMassG)) &&
    s.pouches.every(p => isObj(p) && isStr(p.id) && isStr(p.filterId) && isISODate(p.installedOn)) &&
    s.tests.every(t => isObj(t) && isStr(t.id) && isStr(t.filterId) && isISODate(t.date) &&
      (t.kind === 'influent' || t.kind === 'effluent') && isNum(t.asUgL) && (t.kit === undefined || typeof t.kit === 'string'))
  );
}

export type LoadResult = { state: ProgramState | null; corrupt: boolean };

export function loadState(storage: Pick<Storage, 'getItem'> = localStorage): LoadResult {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw == null) return { state: null, corrupt: false };
    const parsed: unknown = JSON.parse(raw);
    if (isProgramState(parsed)) return { state: parsed, corrupt: false };
    console.warn('Kotodin: stored program failed validation');
    return { state: null, corrupt: true };
  } catch {
    console.warn('Kotodin: stored program could not be read');
    return { state: null, corrupt: true };
  }
}

export function saveState(s: ProgramState | null, storage: Pick<Storage, 'setItem' | 'removeItem'> = localStorage): void {
  try {
    if (s == null) storage.removeItem(STORAGE_KEY);
    else storage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    console.warn('Kotodin: could not save (storage full or blocked)');
  }
}

export const exportJson = (s: ProgramState) => JSON.stringify(s, null, 2);

export function importJson(text: string): ProgramState {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('That file is not valid JSON.'); }
  if (!isProgramState(parsed)) throw new Error('That file is not a Kotodin program export (version 1).');
  return parsed;
}

export function emptyProgram(mediaDefault: ProgramState['media'][number]): ProgramState {
  return {
    version: 1,
    program: { id: `p${Date.now().toString(36)}`, name: 'My filter program', isDemo: false, mediaId: mediaDefault.id, targetUgL: 10 },
    media: [mediaDefault], households: [], filters: [], pouches: [], tests: [],
  };
}

export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
