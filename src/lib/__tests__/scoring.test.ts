import { describe, it, expect } from 'vitest';
import { calculatePowderScore } from '../scoring';
import type { HourlyForecast } from '../types';

function makeHour(
  index: number,
  overrides: Partial<HourlyForecast> = {},
): HourlyForecast {
  return {
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
    expect(result.snowWindow).toEqual([10, 14]);
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
      expect(result.snowWindow[0]).toBeGreaterThanOrEqual(0);
      expect(result.snowWindow[1]).toBeGreaterThan(result.snowWindow[0]);
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
