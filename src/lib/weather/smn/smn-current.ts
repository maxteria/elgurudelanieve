import type { SMNApiResponse, SMNApiStation, SMNCurrent } from './smn-types';
import { findClosestStation, CAVIAHUE_COORDS } from './smn-stations';

const SMN_API_URL = 'https://ws.smn.gob.ar/map_items/weather';

let cachedStations: SMNApiStation[] | null = null;
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchAllStations(): Promise<SMNApiStation[]> {
  const now = Date.now();
  if (cachedStations && now - lastFetch < CACHE_TTL) {
    return cachedStations;
  }

  const res = await fetch(SMN_API_URL);
  if (!res.ok) {
    throw new Error(`SMN API error: ${res.status} ${res.statusText}`);
  }

  const data: SMNApiResponse = await res.json();
  cachedStations = data;
  lastFetch = now;
  return data;
}

export async function fetchSMNCurrent(): Promise<SMNCurrent | null> {
  try {
    const stations = await fetchAllStations();
    const closest = findClosestStation(
      stations,
      CAVIAHUE_COORDS.lat,
      CAVIAHUE_COORDS.lon,
    );

    if (!closest) {
      console.warn('[SMN] No se encontraron estaciones');
      return null;
    }

    const { station, distanceKm } = closest;
    const w = station.weather;

    const updatedAt = station.updated
      ? new Date(station.updated * 1000).toISOString()
      : undefined;

    return {
      source: 'smn',
      stationName: station.name,
      province: station.province,
      lat: parseFloat(station.lat),
      lon: parseFloat(station.lon),
      distanceKm,
      updatedAt,
      temp: w.temp,
      feelsLike: w.st ?? undefined,
      humidity: w.humidity ?? undefined,
      pressure: w.pressure ?? undefined,
      wind: w.wind_speed ?? undefined,
      windDirection: w.wing_deg ?? undefined,
      condition: w.description,
      conditionId: w.id,
      visibility: w.visibility ?? undefined,
    };
  } catch (err) {
    console.warn('[SMN] Error fetching current data:', err);
    return null;
  }
}

export function clearSMNCache(): void {
  cachedStations = null;
  lastFetch = 0;
}
