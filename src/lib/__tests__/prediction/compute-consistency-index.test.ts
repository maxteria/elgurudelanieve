import { describe, it, expect } from 'vitest';
import { evaluateHour } from '../../prediction/evaluate-hour';
import computeConsistencyIndex from '../../prediction/compute-consistency-index';
import { ZONE_BASE } from '../../prediction/types';

import {
  missingData,
  veryHighFreezing,
  hotTemp,
  clearSummitSnow,
  snowfallOnly,
} from '../fixtures/prediction-hourly-fixtures';

describe('computeConsistencyIndex caps', () => {
  it('caps at 45 when missing temperature or freezing level present', () => {
    const hours = [missingData, missingData, missingData].map((s) => evaluateHour(s, ZONE_BASE));
    const res = computeConsistencyIndex(hours, ZONE_BASE);
    expect(res.value).toBeLessThanOrEqual(45);
  });

  it('caps at 35 when freezing level >> zone', () => {
    const hours = [veryHighFreezing, veryHighFreezing].map((s) => evaluateHour(s, ZONE_BASE));
    const res = computeConsistencyIndex(hours, ZONE_BASE);
    expect(res.value).toBeLessThanOrEqual(35);
  });

  it('caps at 35 when temperature > 3 present', () => {
    const hours = [hotTemp, hotTemp].map((s) => evaluateHour(s, ZONE_BASE));
    const res = computeConsistencyIndex(hours, ZONE_BASE);
    expect(res.value).toBeLessThanOrEqual(35);
  });

  it('caps at 50 when main source failed/demo and no alternative', () => {
    const hours = [clearSummitSnow, clearSummitSnow, clearSummitSnow].map((s) => evaluateHour(s, ZONE_BASE));
    const res = computeConsistencyIndex(hours, ZONE_BASE, { openMeteo: 'failed', weatherApi: 'failed', aic: 'failed' });
    expect(res.value).toBeLessThanOrEqual(50);
  });

  it('does not treat snowfall-only signal as insufficient precipitation', () => {
    const hours = [snowfallOnly, snowfallOnly, snowfallOnly].map((s) => evaluateHour(s, ZONE_BASE));
    const res = computeConsistencyIndex(hours, ZONE_BASE);
    expect(res.value).toBeGreaterThan(40);
  });
});
