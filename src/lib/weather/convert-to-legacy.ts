import { NormalizedSnowForecast } from './types';
import type { WeatherData, ZoneForecast, HourlyForecast } from '../types';

const ZONE_CONFIG: {
  id: 'village' | 'mid' | 'top';
  legacyName: 'Pueblo' | 'Centro' | 'Cumbre';
  label: string;
}[] = [
  { id: 'village', legacyName: 'Pueblo', label: 'Pueblo' },
  { id: 'mid', legacyName: 'Centro', label: 'Centro' },
  { id: 'top', legacyName: 'Cumbre', label: 'Cumbre' },
];

const LAPSE_RATE = 0.0065;

function snowProbability(
  temp: number,
  precip: number,
  freezingLevel: number,
  altitude: number,
): number {
  if (precip <= 0) return 0;
  if (freezingLevel <= altitude + 50) return 95;
  if (freezingLevel <= altitude + 150) return 80;
  if (temp <= 0 && freezingLevel <= altitude + 300) return 60;
  if (temp <= 2 && freezingLevel <= altitude + 500) return 40;
  return 15;
}

function windChill(temp: number, windKmh: number): number {
  if (windKmh < 4.8 || temp > 10) return temp;
  const v = windKmh * 0.27778;
  return (
    Math.round(
      (13.12 +
        0.6215 * temp -
        11.37 * Math.pow(v, 0.16) +
        0.3965 * temp * Math.pow(v, 0.16)) *
        10,
    ) / 10
  );
}

export function normalizedToLegacy(
  normalized: NormalizedSnowForecast,
): WeatherData {
  // Open-Meteo no da datos separados por zona.
  // La serie horaria base (normalized.hourly) corresponde a la elevación del modelo.
  // Se deriva Mid y Top aplicando lapse rate desde la elevación de Pueblo (base).
  const baseAlt = normalized.zones.village.altitude;

  const zones: ZoneForecast[] = ZONE_CONFIG.map((cfg) => {
    const zone = normalized.zones[cfg.id];

    const hourly: HourlyForecast[] = normalized.hourly.map((h) => {
      const zoneOffset = (zone.altitude - baseAlt) * LAPSE_RATE;
      const zoneTemp = Math.round((h.temp - zoneOffset) * 10) / 10;
      const zoneWind =
        Math.round(
          h.wind * (1 + 0.08 * ((zone.altitude - baseAlt) / 100)) * 10,
        ) / 10;
      const hour = new Date(h.time).getHours();
      const feelsLike = windChill(zoneTemp, zoneWind);
      const snowProb = snowProbability(
        zoneTemp,
        h.precipitation,
        h.freezingLevel,
        zone.altitude,
      );

      return {
        hour,
        temp: zoneTemp,
        feels_like: feelsLike,
        wind: zoneWind,
        precip: h.precipitation,
        snow_prob: snowProb,
        freezing_level: h.freezingLevel,
        humidity: h.humidity,
        snowfall: h.snowfall,
      };
    });

    return {
      name: cfg.legacyName,
      altitude: zone.altitude,
      hourly,
    };
  });

  return {
    updated: normalized.updatedAt,
    zones,
  };
}
