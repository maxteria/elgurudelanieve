import { describe, it, expect } from 'vitest';
import { evaluateHour } from '../../prediction/evaluate-hour';
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

describe('evaluateHour', () => {
  it('classifies clear summit snow as snow_likely', () => {
    const out = evaluateHour(clearSummitSnow, ZONE_SUMMIT);
    expect(out.classification).toBe('snow_likely');
  });

  it('marks rain in town but snow above as not_snow at base', () => {
    const out = evaluateHour(rainInTownSnowAbove, ZONE_BASE);
    expect(out.classification).toBe('not_snow');
  });

  it('marks marginal by freezing level', () => {
    const out = evaluateHour(marginalByFreezing, ZONE_BASE);
    expect(out.classification).toBe('snow_marginal');
  });

  it('marks marginal by temperature band', () => {
    const out = evaluateHour(marginalByTemperature, ZONE_BASE);
    expect(out.classification).toBe('snow_marginal');
  });

  it('marks no precipitation as not_snow', () => {
    const out = evaluateHour(noPrecip, ZONE_PUEBLO);
    expect(out.classification).toBe('not_snow');
  });

  it('marks temperature > 3 as not_snow', () => {
    const out = evaluateHour(hotTemp, ZONE_PUEBLO);
    expect(out.classification).toBe('not_snow');
  });

  it('marks very high freezing level as not_snow', () => {
    const out = evaluateHour(veryHighFreezing, ZONE_BASE);
    expect(out.classification).toBe('not_snow');
  });

  it('returns unknown when critical data missing', () => {
    const out = evaluateHour(missingData, ZONE_BASE);
    expect(out.classification).toBe('unknown');
  });

  it('uses explicit snowfall even without temp/freezing (conservative)', () => {
    const out = evaluateHour(explicitSnowfallNoTemp, ZONE_BASE);
    // explicit snowfall with missing temp/freezing should not be unknown; conservative -> marginal
    expect(out.classification).toBe('snow_marginal');
  });
});
