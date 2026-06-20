import { describe, it, expect } from 'vitest';
import { buildSnowWindows } from '../../prediction/build-snow-windows';
import { ZONE_BASE } from '../../prediction/types';

function makeSignal(hour: number, classification: 'snow_marginal' | 'snow_likely' | 'not_snow' = 'snow_marginal') {
  const utc = `2026-06-13T${String(hour).padStart(2, '0')}:00:00Z`;
  // minimal shape expected by buildSnowWindows
  return {
    zoneId: ZONE_BASE.id,
    utcHour: utc,
    temperatureC: -1,
    precipitationMm: classification === 'not_snow' ? 0 : 0.3,
    snowfallCm: classification === 'not_snow' ? 0 : 0.5,
    freezingLevelM: ZONE_BASE.elevationM + 100,
  };
}

describe('buildSnowWindows', () => {
  it('returns a valid window for >=2 consecutive snow hours', () => {
    // use future year to avoid being treated as past windows in test environment
    const signals = [
      { ...makeSignal(6), utcHour: '2027-06-13T06:00:00Z' },
      { ...makeSignal(7), utcHour: '2027-06-13T07:00:00Z' },
      { ...makeSignal(8), utcHour: '2027-06-13T08:00:00Z' },
    ];
    const res = buildSnowWindows(signals, ZONE_BASE);
    expect(res.windows).toBeTruthy();
    expect(res.windows.length).toBeGreaterThanOrEqual(1);
    const w = res.windows[0];
    expect(w.durationHours).toBeGreaterThanOrEqual(2);
    expect(w.fromLocalIso).toContain('T');
  });

  it('does not treat non-contiguous hours as a window', () => {
    const signals = [
      { ...makeSignal(6), utcHour: '2027-06-13T06:00:00Z' },
      { ...makeSignal(8), utcHour: '2027-06-13T08:00:00Z' },
    ];
    const res = buildSnowWindows(signals, ZONE_BASE);
    expect(res.windows.length).toBe(0);
  });

  it('rejects single-hour runs (start==end -> invalid)', () => {
    const signals = [{ ...makeSignal(10), utcHour: '2027-06-13T10:00:00Z' }];
    const res = buildSnowWindows(signals, ZONE_BASE);
    expect(res.windows.length).toBe(0);
    expect(res.message).toBeTruthy();
  });

  it('rejects windows fully in the past', () => {
    const pastSignals = [
      { ...makeSignal(0), utcHour: '2000-01-01T00:00:00Z' },
      { ...makeSignal(1), utcHour: '2000-01-01T01:00:00Z' },
    ];
    const res = buildSnowWindows(pastSignals, ZONE_BASE);
    expect(res.windows.length).toBe(0);
    expect(res.message).toBeTruthy();
  });
});
