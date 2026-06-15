import type { SMNApiStation } from './smn-types';
import { CAVIAHUE_COORDS } from '../open-meteo-api';

// Re-export for convenience
export { CAVIAHUE_COORDS };

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findClosestStation(
  stations: SMNApiStation[],
  targetLat: number,
  targetLon: number,
): { station: SMNApiStation; distanceKm: number } | null {
  if (!stations || stations.length === 0) return null;

  let closest: SMNApiStation | null = null;
  let minDist = Infinity;

  for (const s of stations) {
    const sLat = parseFloat(s.lat);
    const sLon = parseFloat(s.lon);
    if (isNaN(sLat) || isNaN(sLon)) continue;
    const d = haversineKm(targetLat, targetLon, sLat, sLon);
    if (d < minDist) {
      minDist = d;
      closest = s;
    }
  }

  if (!closest) return null;
  return { station: closest, distanceKm: Math.round(minDist * 10) / 10 };
}
