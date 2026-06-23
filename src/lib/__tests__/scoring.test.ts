import { describe, it, expect } from 'vitest';
import { calculatePowderScore, calculateConfidence } from '../scoring';
import computeConsistencyIndex from '../prediction/compute-consistency-index';
import evaluateHour from '../prediction/evaluate-hour';
import type { HourlyForecast, SourceStatus } from '../types';

function makeHour(
  index: number,
  overrides: Partial<HourlyForecast> = {},
): HourlyForecast {
  const hour = String(index).padStart(2, '0');
  return {
    time: `2026-06-13T${hour}:00:00`,
    hour: index,
    temp: -2,
    feels_like: -5,
    wind: 10,
    windDir: 180,
    cloudCover: 40,
    windGusts: 14,
    precip: 0,
    snow_prob: 0,
    freezing_level: 1500,
    humidity: 60,
    snowfall: 0,
    snowDepth: 0,
    weatherCode: 0,
    precipitationProbability: 0,
    ...overrides,
  };
}

describe('calculatePowderScore', () => {
  it('returns 0 for a completely dry forecast', () => {
    const forecast: HourlyForecast[] = Array.from({ length: 24 }, (_, i) =>
      makeHour(i, { windDir: 0 }),
    );
    const result = calculatePowderScore(forecast, 1647);
    expect(result.value).toBe(0);
    expect(result.snowWindow).toBeNull();
    expect(result.reason).toContain('bajo');
  });

  it('scores base conditions from precip + temp + freezing level', () => {
    const forecast: HourlyForecast[] = Array.from({ length: 24 }, (_, i) =>
      makeHour(i, {
        // Only hours 10-13 have snow potential
        precip: i >= 10 && i < 14 ? 0.3 : 0,
        temp: i >= 10 && i < 14 ? -1 : 0,
        freezing_level: i >= 10 && i < 14 ? 1600 : 2000,
      }),
    );
    const result = calculatePowderScore(forecast, 1647);
    // Base 60 + temp bonus (<= 0 = 12) + windDir bonus (180 = +15) = 87
    expect(result.value).toBe(87);
    expect(result.snowWindow).toEqual({
      fromTime: '2026-06-13T10:00:00',
      toTime: '2026-06-13T14:00:00',
    });
  });

  it('increases score when snowfall cm is present', () => {
    // Same as above but with snowfall=2 on the same hours
    const forecast: HourlyForecast[] = Array.from({ length: 24 }, (_, i) =>
      makeHour(i, {
        precip: i >= 10 && i < 14 ? 0.3 : 0,
        temp: i >= 10 && i < 14 ? -1 : 0,
        freezing_level: i >= 10 && i < 14 ? 1600 : 2000,
        snowfall: i >= 10 && i < 14 ? 2 : 0,
      }),
    );
    const result = calculatePowderScore(forecast, 1647);
    // Base 60 + temp bonus 12 + snowfall bonus 14 + windDir bonus 15 = 101, capped at 100
    expect(result.value).toBe(100);
    expect(result.reason).toBeTruthy();
  });

  it('caps score at 100 for extreme conditions', () => {
    const forecast: HourlyForecast[] = Array.from({ length: 24 }, (_, i) =>
      makeHour(i, {
        precip: 3,
        temp: -10,
        feels_like: -15,
        wind: 20,
        freezing_level: 800,
        snowfall: 8,
      }),
    );
    const result = calculatePowderScore(forecast, 1647);
    expect(result.value).toBe(100);
    expect(result.reason).toContain('Muy buenas');
  });

  it('computes a snowWindow when score >= 55', () => {
    const forecast: HourlyForecast[] = Array.from({ length: 24 }, (_, i) =>
      makeHour(i, {
        precip: i >= 6 && i < 10 ? 0.5 : 0,
        temp: i >= 6 && i < 10 ? -3 : 0,
        freezing_level: i >= 6 && i < 10 ? 1400 : 2000,
        wind: 15,
        snowfall: i >= 6 && i < 10 ? 1.5 : 0,
      }),
    );
    const result = calculatePowderScore(forecast, 1647);
    expect(result.value).toBeGreaterThanOrEqual(55);
    expect(result.snowWindow).not.toBeNull();
    if (result.snowWindow) {
      expect(result.snowWindow.fromTime).toBeTruthy();
      expect(result.snowWindow.toTime).toBeTruthy();
    }
  });

  it('is not affected by altitude mismatch (high freezing level)', () => {
    const forecast: HourlyForecast[] = Array.from({ length: 24 }, (_, i) =>
      makeHour(i, {
        precip: 2,
        temp: -5,
        feels_like: -8,
        freezing_level: 2500,
        snowfall: 2,
        // Wind from north (no bonus) to isolate the altitude test
        windDir: 0,
      }),
    );
    const result = calculatePowderScore(forecast, 1647);
    // Freezing level 2500 > 1647 + 150 = 1797, so no base snow score
    // No precip+freezing combo, score should be 0
    expect(result.value).toBe(0);
  });
});

// ─── Confidence Score ─────────────────────────────────────────────────────

const allSourcesOk: SourceStatus = {
  openMeteo: 'ok',
  weatherApi: 'ok',
  aic: 'ok',
};

const allSourcesFailed: SourceStatus = {
  openMeteo: 'failed',
  weatherApi: 'failed',
  aic: 'failed',
};

describe('calculateConfidence', () => {
  it('returns Incompleta for empty hourly data', () => {
    const result = calculateConfidence([], allSourcesOk, 1647);
    expect(result.label).toBe('Incompleta');
    expect(result.value).toBe(0);
    expect(result.reasonsAgainst.length).toBeGreaterThanOrEqual(1);
  });

  it('returns Alta when strong snow signals present and sources ok', () => {
    const forecast: HourlyForecast[] = Array.from({ length: 24 }, (_, i) =>
      makeHour(i, {
        // Make the majority of hours positive so the CCI returns High.
        // Ensure non-snow hours do not trigger high-temperature/freezing caps.
        precip: i < 18 ? 0.6 : 0,
        temp: i < 18 ? -1 : 0,
        freezing_level: 1500,
        wind: 15,
      }),
    );
    const result = calculateConfidence(forecast, allSourcesOk, 1647);
    expect(result.label).toBe('Alta');
    expect(result.value).toBeGreaterThanOrEqual(65);
  });

  it('maps computeConsistencyIndex output consistently (integration)', () => {
    // Build a mixed classification set and compare calculateConfidence to
    // computeConsistencyIndex applied to the same evaluated hours.
    const forecast: HourlyForecast[] = Array.from({ length: 12 }, (_, i) =>
      makeHour(i, {
        precip: i % 3 === 0 ? 0.5 : 0,
        temp: i % 3 === 0 ? 0 : 4,
        freezing_level: i % 3 === 0 ? 1500 : 3000,
      }),
    );

    // Evaluate hours using prediction helpers and compute canonical CCI
    const classifications = forecast.map((f) =>
      evaluateHour({
        utcHour: f.time,
        temperatureC: typeof f.temp === 'number' ? f.temp : null,
        precipitationMm: typeof f.precip === 'number' ? f.precip : null,
        snowfallCm: typeof f.snowfall === 'number' ? f.snowfall : null,
        freezingLevelM: typeof f.freezing_level === 'number' ? f.freezing_level : null,
        windKmh: typeof f.wind === 'number' ? f.wind : null,
        humidityPct: typeof f.humidity === 'number' ? f.humidity : null,
        sourceStatus: undefined,
      } as any, { id: 'legacy', name: 'legacy', elevationM: 1647 }),
    );

    const cci = computeConsistencyIndex(classifications, { id: 'legacy', name: 'legacy', elevationM: 1647 }, allSourcesOk);
    const result = calculateConfidence(forecast, allSourcesOk, 1647);

    // Value and label must be consistent (label mapped to Spanish)
    expect(result.value).toBe(cci.value);
    const expectedLabel = cci.label === 'High' ? 'Alta' : cci.label === 'Medium' ? 'Media' : 'Baja';
    expect(result.label).toBe(expectedLabel);
  });

  it('handles null/undefined fields without fabricating zeros', () => {
    const forecast: HourlyForecast[] = Array.from({ length: 24 }, (_, i) =>
      makeHour(i, {
        precip: undefined as any,
        temp: undefined as any,
        freezing_level: undefined as any,
        wind: undefined as any,
      }),
    );
    const result = calculateConfidence(forecast, allSourcesOk, 1647);
    // Should return a valid ConfidenceScore and include trace reasons
    expect(result).toBeTruthy();
    expect(typeof result.value).toBe('number');
    expect(result.reasonsAgainst.length).toBeGreaterThanOrEqual(1);
  });
});
