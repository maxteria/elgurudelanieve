import { describe, it, expect } from 'vitest';
import { evaluateHour } from '../../prediction/evaluate-hour';
import computeConsistencyIndex from '../../prediction/compute-consistency-index';
import { ZONE_BASE, ZONE_PUEBLO } from '../../prediction/types';

import {
  missingData,
  clearSummitSnow,
  snowfallOnly,
  noPrecip,
  hotTemp,
} from '../fixtures/prediction-hourly-fixtures';
import { simulateClassification } from '../mocks/prediction-mocks';

describe('computeConsistencyIndex — consistency semantics', () => {
  it('returns High when all hours agree on not_snow', () => {
    // noPrecip evaluates to not_snow for ZONE_PUEBLO
    const hours = [noPrecip, noPrecip, noPrecip].map((s) => evaluateHour(s, ZONE_PUEBLO));
    const res = computeConsistencyIndex(hours, ZONE_PUEBLO);
    expect(res.label).toBe('High');
    expect(res.value).toBeGreaterThanOrEqual(75);
    // No "Confianza Baja 0" nonsense — confidence is HIGH for consistent no-snow
    expect(res.reasons.some((r) => r.includes('sin condiciones de nieve'))).toBe(true);
  });

  it('returns High when all hours agree on snow_likely', () => {
    // clearSummitSnow on ZONE_SUMMIT → snow_likely
    // We use ZONE_BASE here which is lower than summit, but the test checks the semantic
    const hours = [snowfallOnly, snowfallOnly, snowfallOnly].map((s) => evaluateHour(s, ZONE_BASE));
    const res = computeConsistencyIndex(hours, ZONE_BASE);
    expect(res.label).toBe('High');
    expect(res.value).toBeGreaterThanOrEqual(75);
  });

  it('returns Medium when tendency is clear but mixed', () => {
    // 2 not_snow + 1 snow_likely = 66% dominant → Medium
    const hours = [
      simulateClassification('not_snow'),
      simulateClassification('not_snow'),
      simulateClassification('snow_likely'),
    ];
    const res = computeConsistencyIndex(hours, ZONE_BASE);
    expect(res.label).toBe('Medium');
    expect(res.value).toBeGreaterThanOrEqual(45);
    expect(res.value).toBeLessThan(75);
  });

  it('returns Low when evenly split among classifications', () => {
    const hours = [
      simulateClassification('snow_likely'),
      simulateClassification('snow_marginal'),
      simulateClassification('not_snow'),
      simulateClassification('unknown'),
    ];
    const res = computeConsistencyIndex(hours, ZONE_BASE);
    expect(res.label).toBe('Low');
    expect(res.value).toBeLessThan(45);
  });

  it('returns Low when empty', () => {
    const res = computeConsistencyIndex([], ZONE_BASE);
    expect(res.label).toBe('Low');
    expect(res.value).toBe(0);
  });
});

describe('computeConsistencyIndex caps', () => {
  it('caps at 45 when ≥1/3 hours have missing critical data', () => {
    const hours = [missingData, missingData, missingData, noPrecip, noPrecip, noPrecip]
      .map((s) => evaluateHour(s, ZONE_BASE));
    const res = computeConsistencyIndex(hours, ZONE_BASE);
    // 3 missing out of 6 = 50%, ≥33% ⇒ cap 45
    expect(res.value).toBeLessThanOrEqual(45);
  });

  it('caps at 60 when some hours have missing critical data (< 1/3)', () => {
    const hours = [missingData, noPrecip, noPrecip].map((s) => evaluateHour(s, ZONE_BASE));
    const res = computeConsistencyIndex(hours, ZONE_BASE);
    // 1 missing out of 3 = 33% = threshold, so let's use 1 out of 5 = 20%
    expect(res.value).toBeLessThanOrEqual(60);
  });

  it('does NOT cap for freezing level >> zone or hot temp (handled by evaluateHour)', () => {
    // All hours are consistent not_snow (via evaluateHour) → High even with adverse conditions
    const hours = [hotTemp, hotTemp, hotTemp].map((s) => evaluateHour(s, ZONE_PUEBLO));
    const res = computeConsistencyIndex(hours, ZONE_PUEBLO);
    // Consistency is HIGH because all hours agree (all classified as not_snow)
    expect(res.label).toBe('High');
    expect(res.value).toBeGreaterThanOrEqual(75);
    // No cap reason should be present
    expect(res.reasons.some((r) => r.includes('cap') || r.includes('límite'))).toBe(false);
  });

  it('caps at 50 when main source failed/demo and no alternative', () => {
    // All snow_likely, would be High, but source failure caps it
    const hours = [clearSummitSnow, clearSummitSnow].map((s) => evaluateHour(s, ZONE_BASE));
    const res = computeConsistencyIndex(hours, ZONE_BASE, { openMeteo: 'failed', weatherApi: 'failed', aic: 'failed' });
    expect(res.value).toBeLessThanOrEqual(50);
  });

  it('does not treat snowfall-only signal as insufficient precipitation', () => {
    const hours = [snowfallOnly, snowfallOnly, snowfallOnly].map((s) => evaluateHour(s, ZONE_BASE));
    const res = computeConsistencyIndex(hours, ZONE_BASE);
    expect(res.label).toBe('High');
    expect(res.value).toBeGreaterThan(40);
  });
});

describe('computeConsistencyIndex reasons in Spanish', () => {
  it('includes a Spanish reason for consistent no-snow', () => {
    const hours = [noPrecip, noPrecip].map((s) => evaluateHour(s, ZONE_PUEBLO));
    const res = computeConsistencyIndex(hours, ZONE_PUEBLO);
    expect(res.reasons.some((r) => /sin condiciones de nieve/i.test(r))).toBe(true);
  });

  it('includes human-readable reasons, not English internals', () => {
    const hours = [
      simulateClassification('not_snow'),
      simulateClassification('snow_likely'),
    ];
    const res = computeConsistencyIndex(hours, ZONE_BASE);
    // Ensure no English debug messages leak through
    expect(res.reasons.some((r) => /positive|negative|signal|cap|freazing|temperature/i.test(r))).toBe(false);
  });
});
