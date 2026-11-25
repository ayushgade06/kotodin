import type { Well } from '../engine';
import { unpackWells } from './parseWells';

let cache: Promise<Well[]> | null = null;

/** Fetches /data/wells.json once; a failure clears the memo so callers can retry. */
export function loadWells(): Promise<Well[]> {
  if (!cache) {
    cache = fetch('/data/wells.json')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<unknown>; })
      .then(unpackWells)
      .catch(e => { cache = null; throw e; });
  }
  return cache;
}

export interface WellsMeta {
  source: string; sourcePage: string; generatedAt: string; rows: number;
  pctAbove10: number; pctAbove50: number; shallowPctAbove50: number; attribution: string;
}
