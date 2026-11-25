import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FE_RHA_LITERATURE, todayISO, type Household, type MediaParams, type ProgramState, type Status, type WaterTest } from '../engine';
import { loadWells } from '../data/loadWells';
import { buildDemoProgram } from '../seed/demoProgram';
import { derive, type Derived } from './derive';
import { emptyProgram, exportJson, importJson, loadState, newId, saveState } from './store';

export interface Recalibration { kFrom: number; kTo: number; n: number; changed: { id: string; code: string; from: Status; to: Status }[]; queueDelta: number }

export interface NewHousehold {
  lat: number; lon: number; members: number; litresPerDay: number;
  influentAsUgL: number | null; influentSource: Household['influentSource'];
  pouchMassG: number; installedOn: string;
}

interface Ctx {
  state: ProgramState | null;
  status: 'loading' | 'ready' | 'empty' | 'error';
  corrupt: boolean;
  today: string;
  derived: Derived | null;
  highlight: Set<string>;
  clearHighlight: () => void;
  startDemo: () => Promise<void>;
  createEmpty: () => void;
  addHousehold: (h: NewHousehold) => string;
  updateHousehold: (id: string, patch: Partial<Pick<Household, 'members' | 'litresPerDay' | 'influentAsUgL' | 'influentSource' | 'lat' | 'lon'>>, pouchMassG?: number) => void;
  replacePouch: (filterId: string, date: string) => void;
  addTest: (t: Omit<WaterTest, 'id'>) => Recalibration | null;
  removeTest: (id: string) => void;
  setMedia: (m: MediaParams) => void;
  exportFile: () => void;
  importFile: (text: string) => void;
}

const C = createContext<Ctx | null>(null);
const QUEUE = new Set<Status>(['failed', 'overdue', 'due']);

export function ProgramProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadState());
  const [state, setStateRaw] = useState<ProgramState | null>(initial.current.state);
  const [corrupt, setCorrupt] = useState(initial.current.corrupt);
  const [status, setStatus] = useState<Ctx['status']>(initial.current.state ? 'ready' : 'loading');
  const [highlight, setHighlight] = useState<Set<string>>(new Set());
  const today = useMemo(() => todayISO(), []);

  const setState = useCallback((s: ProgramState | null) => { setStateRaw(s); saveState(s); }, []);

  const startDemo = useCallback(async () => {
    setStatus('loading');
    try {
      const wells = await loadWells();
      setState(buildDemoProgram(wells, todayISO()));
      setCorrupt(false);
      setHighlight(new Set());
      setStatus('ready');
    } catch (e) {
      console.warn('Kotodin: could not build demo program', e);
      setStatus('error');
    }
  }, [setState]);

  // First visit (no stored program, storage not corrupt): load the demo automatically.
  useEffect(() => {
    if (!initial.current.state && !initial.current.corrupt) void startDemo();
    else if (initial.current.corrupt) setStatus('empty');
  }, [startDemo]);

  const derived = useMemo(() => (state ? derive(state, today) : null), [state, today]);

  const update = useCallback((fn: (s: ProgramState) => ProgramState) => {
    setStateRaw(prev => { if (!prev) return prev; const next = fn(prev); saveState(next); return next; });
  }, []);

  const value: Ctx = {
    state, status, corrupt, today, derived, highlight,
    clearHighlight: () => setHighlight(new Set()),
    startDemo,
    createEmpty: () => { setState(emptyProgram(FE_RHA_LITERATURE)); setCorrupt(false); setStatus('ready'); },
    addHousehold: h => {
      const id = newId('h'), fid = newId('f');
      update(s => {
        const max = s.households.reduce((m, x) => Math.max(m, Number(/\d+$/.exec(x.code)?.[0] ?? 0)), 0);
        const code = `HH-${String(max + 1).padStart(3, '0')}`;
        const tests: WaterTest[] = h.influentSource === 'field_test' && h.influentAsUgL != null
          ? [{ id: newId('t'), filterId: fid, date: h.installedOn, kind: 'influent', asUgL: h.influentAsUgL }] : [];
        return {
          ...s,
          households: [...s.households, { id, code, lat: h.lat, lon: h.lon, members: h.members, litresPerDay: h.litresPerDay, influentAsUgL: h.influentAsUgL, influentSource: h.influentSource, createdAt: h.installedOn }],
          filters: [...s.filters, { id: fid, householdId: id, mediaId: s.program.mediaId, pouchMassG: h.pouchMassG }],
          pouches: [...s.pouches, { id: newId('p'), filterId: fid, installedOn: h.installedOn }],
          tests: [...s.tests, ...tests],
        };
      });
      return id;
    },
    updateHousehold: (id, patch, pouchMassG) => update(s => ({
      ...s,
      households: s.households.map(h => (h.id === id ? { ...h, ...patch } : h)),
      filters: pouchMassG == null ? s.filters : s.filters.map(f => (f.householdId === id ? { ...f, pouchMassG } : f)),
    })),
    replacePouch: (filterId, date) => update(s => ({ ...s, pouches: [...s.pouches, { id: newId('p'), filterId, installedOn: date }] })),
    addTest: t => {
      if (!state || !derived) return null;
      const test: WaterTest = { ...t, id: newId('t') };
      let next: ProgramState = { ...state, tests: [...state.tests, test] };
      if (t.kind === 'influent') {
        const f = state.filters.find(x => x.id === t.filterId);
        if (f) next = { ...next, households: next.households.map(h => (h.id === f.householdId ? { ...h, influentAsUgL: t.asUgL, influentSource: 'field_test' } : h)) };
      }
      setState(next);
      const after = derive(next, today);
      if (after.calibration.k === derived.calibration.k) return null;
      const tested = state.filters.find(f => f.id === t.filterId)?.householdId;
      const changed = after.rows
        .map(r => ({ id: r.householdId, code: r.code, from: derived.byHousehold.get(r.householdId)?.forecast.status, to: r.forecast.status }))
        .filter((c): c is Recalibration['changed'][number] => c.from != null && c.from !== c.to && c.id !== tested);
      const qCount = (d: Derived) => d.rows.filter(r => QUEUE.has(r.forecast.status)).length;
      setHighlight(new Set(changed.map(c => c.id)));
      return { kFrom: derived.calibration.k, kTo: after.calibration.k, n: after.calibration.n, changed, queueDelta: qCount(after) - qCount(derived) };
    },
    removeTest: id => update(s => ({ ...s, tests: s.tests.filter(t => t.id !== id) })),
    setMedia: m => update(s => ({ ...s, media: [...s.media.filter(x => x.id !== m.id), m], program: { ...s.program, mediaId: m.id } })),
    exportFile: () => {
      if (!state) return;
      const url = URL.createObjectURL(new Blob([exportJson(state)], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `kotodin-${state.program.id}-${today}.json` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    importFile: text => { setState(importJson(text)); setCorrupt(false); setHighlight(new Set()); setStatus('ready'); },
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useProgram(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('useProgram outside ProgramProvider');
  return c;
}
