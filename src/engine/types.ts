export type ISODate = string; // YYYY-MM-DD
export type Band = 'low' | 'mid' | 'high';
export const BANDS: readonly Band[] = ['low', 'mid', 'high'];
export const BAND_INDEX: Record<Band, 0 | 1 | 2> = { low: 0, mid: 1, high: 2 };

export interface MediaParams {
  id: string;
  name: string;
  source: 'literature' | 'custom';
  qmax: [number, number, number]; // mg/g low/mid/high
  b: number; // L/mg (Langmuir affinity)
  derate: [number, number, number]; // field derating low/mid/high
  fBT: number; // fraction of equilibrium capacity usable before breakthrough
  pouchCostBDT: number;
  citations: { label: string; url: string }[];
}

export interface Household {
  id: string;
  code: string; // "HH-014"
  lat: number;
  lon: number;
  members: number;
  litresPerDay: number;
  influentAsUgL: number | null;
  influentSource: 'field_test' | 'bgs_nearest' | 'unknown';
  createdAt: ISODate;
}

export interface Filter { id: string; householdId: string; mediaId: string; pouchMassG: number }
export interface PouchEvent { id: string; filterId: string; installedOn: ISODate }
export interface WaterTest {
  id: string;
  filterId: string;
  date: ISODate;
  kind: 'influent' | 'effluent';
  asUgL: number;
  kit?: string;
}

export interface ProgramState {
  version: 1;
  program: { id: string; name: string; isDemo: boolean; mediaId: string; targetUgL: 10 };
  media: MediaParams[];
  households: Household[];
  filters: Filter[];
  pouches: PouchEvent[];
  tests: WaterTest[];
}

export interface Well {
  id: string;
  lat: number;
  lon: number;
  district: string;
  upazila: string;
  depthM: number | null;
  asUgL: number;
  approxLocation?: boolean;
}

export type Status = 'ok' | 'due' | 'overdue' | 'failed' | 'not_needed' | 'unknown_influent';

export type Triple = { low: number; mid: number; high: number };

export interface ForecastInput {
  c0: number | null; // influent arsenic µg/L
  litresPerDay: number;
  massG: number;
  media: MediaParams;
  k?: number; // fleet calibration factor
  installedOn: ISODate;
  today: ISODate;
  targetUgL?: number; // default 10 (WHO guideline)
  effluentTests?: { date: ISODate; asUgL: number }[];
}

export interface Forecast {
  status: Status;
  k: number;
  dailyLoadMg: number | null;
  qe: Triple | null; // mg/g at C0
  capacityMg: Triple | null;
  days: Triple | null; // days to breakthrough from install (fractional)
  daysLeft: Triple | null; // whole days until each band's breakthrough, from today
  daysElapsed: number;
  replaceBy: ISODate | null; // installedOn + floor(days.low)
  failedTest: { date: ISODate; asUgL: number } | null;
}
