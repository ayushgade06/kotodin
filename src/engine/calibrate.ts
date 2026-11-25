export interface BreakthroughObservation {
  filterId: string;
  daysToBreakthrough: number; // install → first failing effluent test
  dailyLoadMg: number;
  qMidUncalibratedMg: number; // lab-based mid capacity with k = 1
}

export interface Calibration {
  k: number;
  n: number; // usable observations
  needed: number; // minimum observations before k ≠ 1
  ratios: number[]; // Q_obs / Q_mid for each observation
  medianRatio: number | null;
  clamped: boolean;
}

export const MIN_CALIBRATION_TESTS = 3;
export const K_RANGE = [0.2, 2.0] as const;

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Fleet calibration: k = clamp(median(Q_obs / Q_mid), 0.2, 2.0) once ≥ 3 breakthroughs are observed.
 * Q_obs = daily load × days from install to the first failing effluent test.
 */
export function calibrate(observations: BreakthroughObservation[]): Calibration {
  const ratios = observations
    .filter(o => o.daysToBreakthrough > 0 && o.qMidUncalibratedMg > 0)
    .map(o => (o.dailyLoadMg * o.daysToBreakthrough) / o.qMidUncalibratedMg);
  const med = median(ratios);
  const n = ratios.length;
  if (n < MIN_CALIBRATION_TESTS || med == null) {
    return { k: 1, n, needed: MIN_CALIBRATION_TESTS, ratios, medianRatio: med, clamped: false };
  }
  const k = Math.min(K_RANGE[1], Math.max(K_RANGE[0], med));
  return { k, n, needed: MIN_CALIBRATION_TESTS, ratios, medianRatio: med, clamped: k !== med };
}
