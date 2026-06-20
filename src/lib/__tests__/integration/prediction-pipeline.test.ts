import { describe, it, expect } from 'vitest';
import { buildGuruCacheKey } from '../../cache/build-guru-cache-key';
import { analyzeWeather } from '../../snow-engine';
import type { NormalizedSnowForecast } from '../../weather/types';

function futureDateStr(daysAhead = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

function makeHourlyForecast(index: number, overrides: Partial<any> = {}) {
  const hour = String(index).padStart(2, '0');
  const time = `${futureDateStr(7)}T${hour}:00:00`;
  return {
    time,
    temp: 0,
    feelsLike: -2,
    precipitation: 0,
    snowfall: 0,
    freezingLevel: 2000,
    wind: 10,
    windDir: 0,
    windGusts: 10,
    humidity: 60,
    cloudCover: 50,
    snowDepth: 0.15,
    weatherCode: 0,
    precipitationProbability: 0,
    ...overrides,
  };
}

function makeZoneHourly(length: number, factory: (i: number) => Partial<any>) {
  return Array.from({ length }, (_, i) => makeHourlyForecast(i, factory(i)));
}

function makeSnowForecast(baseHourly: any[]): NormalizedSnowForecast {
  const first = baseHourly[0];
  const zones: any = {};
  const ALTITUDES = [
    { id: 'village', label: 'Pueblo (base)', altitude: 1647 },
    { id: 'mid', label: 'Centro (medio)', altitude: 1846 },
    { id: 'top', label: 'Cumbre (alto)', altitude: 2045 },
  ];
  for (const z of ALTITUDES) {
    zones[z.id] = {
      id: z.id,
      label: z.label,
      altitude: z.altitude,
      temp: first.temp,
      feelsLike: first.feelsLike,
      wind: first.wind,
      precipitation: first.precipitation,
      snowChance: 0,
      freezingLevel: first.freezingLevel,
      humidity: first.humidity,
      snowDepth: first.snowDepth,
      weatherCode: first.weatherCode,
      precipitationProbability: first.precipitationProbability,
    };
  }
  return {
    updatedAt: `${futureDateStr(7)}T12:00:00Z`,
    location: { name: 'Caviahue', lat: -37.85, lon: -71.05 },
    zones: zones as any,
    hourly: baseHourly,
  } as NormalizedSnowForecast;
}

describe('prediction pipeline integration', () => {
  it('buildGuruCacheKey includes fingerprint/zone/window and changes when window or resort hash changes', () => {
    const fp = { hash: 'abc123' };
    const key1 = buildGuruCacheKey(fp, 'village', 'w1', '1', 'r1', 'g1');
    const key2 = buildGuruCacheKey(fp, 'village', 'w2', '1', 'r1', 'g1');
    const key3 = buildGuruCacheKey(fp, 'village', 'w2', '1', 'r2', 'g1');

    expect(key1).toContain('guru:abc123');
    expect(key1).toContain('zone:village');
    expect(key1).toContain('w:w1');
    expect(key1).not.toEqual(key2);
    expect(key2).not.toEqual(key3);
  });

  it('analyzeWeather produces a validatedWindow with UTC bounds that can be used in cache key', () => {
    const baseHourly = makeZoneHourly(24, (i) => {
      if (i < 6) {
        return {
          precipitation: 1.5,
          temp: -5,
          freezingLevel: 1300,
          wind: 15,
          snowfall: 3,
        };
      }
      return { precipitation: 0, temp: 5, freezingLevel: 3000 };
    });
    const forecast = makeSnowForecast(baseHourly);
    const interp = analyzeWeather(forecast);

    expect(interp.bestWindow.hasWindow).toBe(true);
    // validatedWindow should include normalized UTC start/end after our changes
    expect(interp.validatedWindow).toBeDefined();
    const vw = interp.validatedWindow!;
    // Assert startUtc is present (not just localized labels)
    expect(vw.startUtc).toBeDefined();

    const fp = { hash: 'fingerprint-x' };
    const key = buildGuruCacheKey(fp, 'village', vw.startUtc ?? 'all', '1.0', 'resort-hash', 'gov-hash');
    expect(key).toContain('guru:fingerprint-x');
    expect(key).toContain('zone:village');
    expect(key).toContain(':w:');
  });
});
