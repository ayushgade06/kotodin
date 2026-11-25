import type { MediaParams } from './types';

/**
 * Default preset. Every number here is an [ASSUMPTION] drawn from published ranges for
 * iron-modified rice-husk materials, NOT a measurement of any specific filter.
 */
export const FE_RHA_LITERATURE: MediaParams = {
  id: 'fe-rha-lit',
  name: 'Fe-RHA (literature range)',
  source: 'literature',
  qmax: [2.24, 6.32, 12],
  b: 2.0,
  derate: [0.3, 0.5, 0.8],
  fBT: 0.5,
  pouchCostBDT: 150,
  citations: [
    { label: 'Low 2.24 mg/g: Fe-modified rice-husk carbon (J. Water Environ. Technol., 2009)', url: 'https://doi.org/10.2965/jwet.2009.43' },
    { label: 'Mid 6.32 mg/g: Fe-modified rice-husk biochar, arsenate (2022, PMC9692524)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9692524/' },
  ],
};

export const PRESETS: MediaParams[] = [FE_RHA_LITERATURE];

export interface CustomPresetInput {
  qmax: [number, number, number];
  b: number;
  derate: [number, number, number];
  fBT: number;
  pouchCostBDT: number;
}

export function makeCustomPreset(v: CustomPresetInput, id = 'custom'): MediaParams {
  const p: MediaParams = { ...v, id, name: 'Your lab data', source: 'custom', citations: [] };
  validateMedia(p);
  return p;
}

export function validateMedia(p: MediaParams): void {
  const inRange = (x: number, lo: number, hi: number) => Number.isFinite(x) && x >= lo && x <= hi;
  if (!p.qmax.every(q => inRange(q, 0.01, 200))) throw new RangeError('qmax must be 0.01–200 mg/g');
  if (!(p.qmax[0] <= p.qmax[1] && p.qmax[1] <= p.qmax[2])) throw new RangeError('qmax must be ordered low ≤ mid ≤ high');
  if (!p.derate.every(d => inRange(d, 0.05, 1))) throw new RangeError('derate must be 0.05–1');
  if (!(p.derate[0] <= p.derate[1] && p.derate[1] <= p.derate[2])) throw new RangeError('derate must be ordered low ≤ mid ≤ high');
  if (!inRange(p.b, 0.001, 1000)) throw new RangeError('b must be 0.001–1000 L/mg');
  if (!inRange(p.fBT, 0.01, 1)) throw new RangeError('fBT must be 0.01–1');
  if (!inRange(p.pouchCostBDT, 0, 100000)) throw new RangeError('pouch cost must be 0–100000');
}
