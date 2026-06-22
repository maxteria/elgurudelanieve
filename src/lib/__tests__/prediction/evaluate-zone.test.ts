import { describe, it, expect } from 'vitest';
import { evaluateZone } from '../../prediction/evaluate-zone';
import {
  clearSummitSnow,
  rainInTownSnowAbove,
  marginalByFreezing,
  marginalByTemperature,
  noPrecip,
  hotTemp,
  veryHighFreezing,
  missingData,
  explicitSnowfallNoTemp,
} from '../fixtures/prediction-hourly-fixtures';
import { ZONE_PUEBLO, ZONE_BASE, ZONE_SUMMIT } from '../../prediction/types';

describe('evaluateZone', () => {
  it('returns yes for 3 consecutive snow_likely hours at summit', () => {
    // build three consecutive hours of summit snow
    const signals = [0, 1, 2].map((i) => ({ ...clearSummitSnow, utcHour: `2026-06-13T${String(10 + i).padStart(2, '0')}:00:00Z` }));
    const out = evaluateZone(ZONE_SUMMIT, signals);
    expect(out.summary).toBe('yes');
  });

  it('returns no when rain in town and freezing level well above base', () => {
    const signals = [rainInTownSnowAbove];
    const out = evaluateZone(ZONE_BASE, signals);
    expect(out.summary).toBe('no');
  });

  it('returns possible for marginal signals', () => {
    const signals = [marginalByFreezing, marginalByTemperature];
    const out = evaluateZone(ZONE_BASE, signals);
    expect(out.summary).toBe('possible');
  });

  it('returns no for no precipitation', () => {
    const out = evaluateZone(ZONE_PUEBLO, [noPrecip]);
    expect(out.summary).toBe('no');
  });

  it('returns unknown when all hours unknown', () => {
    const out = evaluateZone(ZONE_BASE, [missingData]);
    expect(out.summary).toBe('unknown');
  });

  it('uses explicit snowfall to move to marginal when temp/freezing missing', () => {
    const out = evaluateZone(ZONE_BASE, [explicitSnowfallNoTemp]);
    expect(out.summary).toBe('possible');
  });

  it('flags contradictions for very high freezing level', () => {
    const out = evaluateZone(ZONE_BASE, [veryHighFreezing]);
    expect(out.contradictions.length).toBeGreaterThanOrEqual(1);
  });

  it('does not produce a snow-positive summary when precipitation is missing', () => {
    // temperature and freezing known but precipitation is explicitly missing
    const sig = {
      zoneId: ZONE_BASE.id,
      utcHour: '2026-06-13T20:00:00Z',
      temperatureC: -1.0,
      precipitationMm: null,
      snowfallCm: null,
      freezingLevelM: ZONE_BASE.elevationM + 100,
    };
    const out = evaluateZone(ZONE_BASE, [sig]);
    // Should not claim snow when precipitation is unknown
    expect(out.summary === 'yes' || out.summary === 'possible').toBe(false);
  });

  it('treats missing temperature as unknown even if precipitation present', () => {
    const sig = {
      zoneId: ZONE_BASE.id,
      utcHour: '2026-06-13T21:00:00Z',
      temperatureC: undefined,
      precipitationMm: 0.5,
      snowfallCm: null,
      freezingLevelM: undefined,
    };
    const out = evaluateZone(ZONE_BASE, [sig]);
    expect(out.summary).toBe('unknown');
  });
});
