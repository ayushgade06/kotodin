import type { Well } from './types';
import { median } from './calibrate';

const R_KM = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export type NearWell = Well & { distanceKm: number };

/** The k nearest survey wells within radiusKm, and the median of their arsenic (an estimate, not a test). */
export function nearestWells(wells: Well[], lat: number, lon: number, radiusKm = 5, k = 5): { wells: NearWell[]; medianAs: number | null } {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new RangeError('Invalid coordinates');
  const near = wells
    .map(w => ({ ...w, distanceKm: haversineKm(lat, lon, w.lat, w.lon) }))
    .filter(w => w.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, k);
  return { wells: near, medianAs: median(near.map(w => w.asUgL)) };
}
