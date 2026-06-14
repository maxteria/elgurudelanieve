import { describe, it, expect } from 'vitest';
import { analyzeWeather } from '../snow-engine';
import type {
  NormalizedSnowForecast,
  NormalizedHourlyForecast,
  NormalizedZoneForecast,
} from '../weather/types';

// ---------------------------------------------------------------------------
// Helpers — build NormalizedSnowForecast for the refactored engine
// ---------------------------------------------------------------------------

function makeHourlyForecast(
  index: number,
  overrides: Partial<NormalizedHourlyForecast> = {},
): NormalizedHourlyForecast {
  // Use local-time format (no Z suffix) matching real Open-Meteo data
  const hour = String(index).padStart(2, '0');
  const time = `2026-06-13T${hour}:00:00`;
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
    ...overrides,
  };
}

function makeZoneHourly(
  length: number,
  factory: (i: number) => Partial<NormalizedHourlyForecast>,
): NormalizedHourlyForecast[] {
  return Array.from({ length }, (_, i) => makeHourlyForecast(i, factory(i)));
}

interface ZoneSnap {
  id: 'village' | 'mid' | 'top';
  label: string;
  altitude: number;
}

const ALTITUDES: ZoneSnap[] = [
  { id: 'village', label: 'Pueblo (base)', altitude: 1647 },
  { id: 'mid', label: 'Centro (medio)', altitude: 1846 },
  { id: 'top', label: 'Cumbre (alto)', altitude: 2045 },
];

function makeZoneSnapshot(
  id: 'village' | 'mid' | 'top',
  altitude: number,
  label: string,
  firstHour: NormalizedHourlyForecast,
): NormalizedZoneForecast {
  return {
    id,
    label,
    altitude,
    temp: firstHour.temp,
    feelsLike: firstHour.feelsLike,
    wind: firstHour.wind,
    precipitation: firstHour.precipitation,
    snowChance: 0,
    freezingLevel: firstHour.freezingLevel,
    humidity: firstHour.humidity,
  };
}

function makeSnowForecast(
  baseHourly: NormalizedHourlyForecast[],
): NormalizedSnowForecast {
  const first = baseHourly[0];
  const zones: Record<string, NormalizedZoneForecast> = {};
  for (const z of ALTITUDES) {
    zones[z.id] = makeZoneSnapshot(z.id, z.altitude, z.label, first);
  }
  return {
    updatedAt: '2026-06-13T12:00:00Z',
    location: { name: 'Caviahue', lat: -37.85, lon: -71.05 },
    zones: zones as NormalizedSnowForecast['zones'],
    hourly: baseHourly,
  };
}

function makeForecastFromFactory(
  hourlyFactory: (i: number) => Partial<NormalizedHourlyForecast>,
  length = 24,
): NormalizedSnowForecast {
  return makeSnowForecast(makeZoneHourly(length, hourlyFactory));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('analyzeWeather', () => {
  it('returns "no" status and "sin nieve a la vista" for completely dry forecast', () => {
    const forecast = makeForecastFromFactory(() => ({
      precipitation: 0,
      temp: 5,
      freezingLevel: 3000,
    }));
    const result = analyzeWeather(forecast);

    expect(result.mainAnswer.status).toBe('no');
    expect(result.snowLabel).toBe('sin nieve a la vista');
    expect(result.powderScore.value).toBe(0);
    expect(result.bestWindow.hasWindow).toBe(false);
  });

  it('detects moderate snow with correct snowLabel and zones', () => {
    // Snow starts at hour 3 (so status = 'possible')
    // Powder score: base 60 + wind penalty (wind 50 → -10) = 50 → 35-54 range
    const forecast = makeForecastFromFactory((i) => {
      if (i >= 3 && i < 7) {
        return {
          precipitation: 0.5,
          temp: 1,
          freezingLevel: 1600,
          wind: 50,
        };
      }
      return { precipitation: 0, temp: 5, freezingLevel: 3000 };
    });
    const result = analyzeWeather(forecast);

    expect(result.mainAnswer.status).toBe('possible');
    expect(result.snowLabel).toBe('nieve moderada');
    expect(result.powderScore.value).toBeGreaterThanOrEqual(35);
    expect(result.powderScore.value).toBeLessThan(55);

    // All three zone interpretations present
    expect(result.zones.village).toBeDefined();
    expect(result.zones.mid).toBeDefined();
    expect(result.zones.top).toBeDefined();

    // At least one zone should have a non-'no' answer
    const anySnow = [
      result.zones.village,
      result.zones.mid,
      result.zones.top,
    ].some((z) => z.answer.status !== 'no');
    expect(anySnow).toBe(true);
  });

  it('returns "se viene un paquetón" for heavy snow with window', () => {
    // Heavy snow starting hour 0, very cold → high powder score + snow window
    const forecast = makeForecastFromFactory((i) => {
      if (i < 8) {
        return {
          precipitation: 1.5,
          temp: -5,
          freezingLevel: 1400,
          wind: 15,
          snowfall: 3,
        };
      }
      return { precipitation: 0, temp: 5, freezingLevel: 3000 };
    });
    const result = analyzeWeather(forecast);

    expect(result.mainAnswer.status).toBe('yes');
    expect(result.powderScore.value).toBeGreaterThanOrEqual(78);
    expect(result.bestWindow.hasWindow).toBe(true);
    expect(result.snowLabel).toBe('se viene un paquetón');
  });

  it('handles empty hourly gracefully (no data)', () => {
    // Build forecast with empty hourly but valid zone snapshots
    const forecast: NormalizedSnowForecast = {
      updatedAt: '2026-06-13T12:00:00Z',
      location: { name: 'Caviahue', lat: -37.85, lon: -71.05 },
      zones: {
        village: {
          id: 'village',
          label: 'Pueblo (base)',
          altitude: 1647,
          temp: 0,
          feelsLike: -2,
          wind: 10,
          precipitation: 0,
          snowChance: 0,
          freezingLevel: 2000,
          humidity: 60,
        },
        mid: {
          id: 'mid',
          label: 'Centro (medio)',
          altitude: 1846,
          temp: -1,
          feelsLike: -3,
          wind: 12,
          precipitation: 0,
          snowChance: 0,
          freezingLevel: 2000,
          humidity: 60,
        },
        top: {
          id: 'top',
          label: 'Cumbre (alto)',
          altitude: 2045,
          temp: -2,
          feelsLike: -4,
          wind: 14,
          precipitation: 0,
          snowChance: 0,
          freezingLevel: 2000,
          humidity: 60,
        },
      },
      hourly: [],
    };
    const result = analyzeWeather(forecast);

    expect(result.mainAnswer.status).toBe('no');
    expect(result.snowLabel).toBe('sin nieve a la vista');
    expect(result.zones.village).toBeDefined();
  });

  it('handles extreme temps correctly', () => {
    const forecast = makeForecastFromFactory(() => ({
      precipitation: 1,
      temp: 12,
      freezingLevel: 3500,
    }));
    const result = analyzeWeather(forecast);

    expect(result.mainAnswer.status).toBe('no');
    expect(result.powderScore.value).toBe(0);
  });

  it('handles varying freezing levels across zones', () => {
    // Freezing level varies: only top/mid zones (higher altitude) should get snow
    const baseHourly = makeZoneHourly(24, (i) => {
      if (i >= 2 && i < 6) {
        return {
          precipitation: 0.8,
          temp: -1,
          // At Pueblo (1647): 1900 > 1647+150=1797 → no snow
          // At Centro (1846): 1900 <= 1846+150=1996 → snow
          // At Cumbre (2045): 1900 <= 2045+150=2195 → snow
          freezingLevel: 1900,
        };
      }
      return { precipitation: 0, temp: 5, freezingLevel: 3000 };
    });
    const forecast = makeSnowForecast(baseHourly);
    const result = analyzeWeather(forecast);

    expect(result.zones.village.answer.status).toBe('no');
    expect(result.zones.mid.answer.status).toBe('possible');
    expect(result.zones.top.answer.status).toBe('possible');
    expect(result.mainAnswer.status).toBe('possible');
  });
});

describe('generateZoneAlerts (via analyzeWeather)', () => {
  it('creates wind danger alert when wind > 40 in a zone', () => {
    const forecast = makeForecastFromFactory((i) => {
      if (i === 0) {
        return {
          wind: 45,
          precipitation: 0.3,
          temp: -1,
          freezingLevel: 1600,
        };
      }
      return { precipitation: 0, temp: 5, freezingLevel: 3000 };
    });
    const result = analyzeWeather(forecast);

    const allAlerts = [
      ...result.zones.village.alerts,
      ...result.zones.mid.alerts,
      ...result.zones.top.alerts,
    ];
    const windDanger = allAlerts.find(
      (a) => a.type === 'viento' && a.level === 'danger',
    );
    expect(windDanger).toBeDefined();
    expect(windDanger!.message).toContain('45 km/h');
  });

  it('creates wind warning alert when wind > 30 in first 4 hours (no danger)', () => {
    const forecast = makeForecastFromFactory((i) => {
      if (i >= 0 && i < 3) {
        return {
          wind: 35,
          precipitation: 0.3,
          temp: -1,
          freezingLevel: 1600,
        };
      }
      return { precipitation: 0, temp: 5, freezingLevel: 3000, wind: 5 };
    });
    const result = analyzeWeather(forecast);

    const allAlerts = [
      ...result.zones.village.alerts,
      ...result.zones.mid.alerts,
      ...result.zones.top.alerts,
    ];
    const windWarning = allAlerts.find(
      (a) => a.type === 'viento' && a.level === 'warning',
    );
    expect(windWarning).toBeDefined();
  });

  it('creates rain alert when freezing level is high with precip', () => {
    const forecast = makeForecastFromFactory((i) => {
      if (i === 0) {
        return {
          precipitation: 0.8,
          temp: 1,
          freezingLevel: 2000,
          wind: 10,
        };
      }
      return { precipitation: 0, temp: 5, freezingLevel: 3000 };
    });
    const result = analyzeWeather(forecast);

    const allAlerts = [
      ...result.zones.village.alerts,
      ...result.zones.mid.alerts,
      ...result.zones.top.alerts,
    ];
    const rainAlert = allAlerts.find((a) => a.type === 'lluvia');
    expect(rainAlert).toBeDefined();
    expect(rainAlert!.level).toBe('warning');
  });
});

describe('generateSummary (via analyzeWeather)', () => {
  it('generates "frío seco" summary for dry cold conditions', () => {
    // mainStatus='no', village temp <= 2, precip <= 0.2, humidity < 65
    const forecast = makeForecastFromFactory(() => ({
      precipitation: 0,
      temp: 0,
      freezingLevel: 1600,
      humidity: 50,
      wind: 5,
    }));
    const result = analyzeWeather(forecast);

    expect(result.guruSummary).toContain('Frío seco');
    expect(result.guruSummary).toContain('falta precipitación');
  });

  it('includes window info in summary when snow window is present', () => {
    const forecast = makeForecastFromFactory((i) => {
      if (i < 6) {
        return {
          precipitation: 1.0,
          temp: -3,
          freezingLevel: 1400,
          wind: 15,
          snowfall: 2,
        };
      }
      return { precipitation: 0, temp: 5, freezingLevel: 3000 };
    });
    const result = analyzeWeather(forecast);

    expect(result.bestWindow.hasWindow).toBe(true);
    expect(result.guruSummary).toContain('Mejor ventana');
  });

  it('includes wind caution when max wind >= 35', () => {
    const forecast = makeForecastFromFactory((i) => {
      if (i >= 2 && i < 5) {
        return {
          precipitation: 0.5,
          temp: -1,
          freezingLevel: 1600,
          wind: 40,
        };
      }
      return { precipitation: 0, temp: 5, freezingLevel: 3000, wind: 35 };
    });
    const result = analyzeWeather(forecast);

    expect(result.guruSummary).toContain('viento');
  });

  it('uses fallback rules when no content rules match (no snow)', () => {
    // mainStatus='no', village temp > 2 (no frío seco), freezing > 1700 (no cota fav)
    const forecast = makeForecastFromFactory(() => ({
      precipitation: 0,
      temp: 5,
      freezingLevel: 2500,
      humidity: 50,
      wind: 5,
    }));
    const result = analyzeWeather(forecast);

    expect(result.mainAnswer.status).toBe('no');
    expect(result.guruSummary).toContain('Sin precipitación relevante');
  });

  it('mentions powder score when value >= 70', () => {
    const forecast = makeForecastFromFactory((i) => {
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
    const result = analyzeWeather(forecast);

    expect(result.powderScore.value).toBeGreaterThanOrEqual(70);
    expect(result.guruSummary).toContain('Polvo asegurado');
  });
});
