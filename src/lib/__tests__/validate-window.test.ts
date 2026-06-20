import { describe, it, expect } from 'vitest';
import { validateWindow } from '../validate-window';
import caviahue from '../time/caviahue-time';

describe('validateWindow', () => {
  it('rejects null fromTime', () => {
    const result = validateWindow(null, '2026-06-20T03:00:00');
    expect(result.hasWindow).toBe(false);
    expect(result.description).toContain('No hay una ventana clara');
  });

  it('rejects undefined toTime', () => {
    const result = validateWindow('2026-06-19T23:00:00', undefined);
    expect(result.hasWindow).toBe(false);
  });

  it('rejects malformed date strings', () => {
    const result = validateWindow('invalid-date', '2026-06-20T03:00:00');
    expect(result.hasWindow).toBe(false);
  });

  it('rejects zero-duration window (same from and to)', () => {
    const result = validateWindow(
      '2026-06-19T23:00:00',
      '2026-06-19T23:00:00',
    );
    expect(result.hasWindow).toBe(false);
  });

  it('rejects negative duration (to before from)', () => {
    const result = validateWindow(
      '2026-06-20T03:00:00',
      '2026-06-19T23:00:00',
    );
    expect(result.hasWindow).toBe(false);
  });

  it('rejects past windows', () => {
    const result = validateWindow('2020-01-01T00:00:00', '2020-01-01T03:00:00');
    expect(result.hasWindow).toBe(false);
  });

  it('accepts valid midnight-crossing window', () => {
    const result = validateWindow(
      '2027-01-01T23:00:00',
      '2027-01-02T03:00:00',
    );
    expect(result.hasWindow).toBe(true);
    // Labels are computed using Caviahue timezone helpers and therefore
    // deterministic regardless of the test runner's TZ. Compute expected
    // labels via the same helper.
    const WEEKDAY_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const fromParts = caviahue.toCaviahue('2027-01-01T23:00:00');
    const toParts = caviahue.toCaviahue('2027-01-02T03:00:00');
    const fromDay = WEEKDAY_SHORT[new Date(fromParts.localIso + 'Z').getUTCDay()];
    const toDay = WEEKDAY_SHORT[new Date(toParts.localIso + 'Z').getUTCDay()];
    expect(result.from).toBe(`${fromDay} ${String(fromParts.localHour).padStart(2, '0')}:00`);
    expect(result.to).toBe(`${toDay} ${String(toParts.localHour).padStart(2, '0')}:00`);
  });

  it('accepts valid same-day window', () => {
    const result = validateWindow(
      '2026-12-24T10:00:00',
      '2026-12-24T14:00:00',
    );
    expect(result.hasWindow).toBe(true);
    const partsFrom = caviahue.toCaviahue('2026-12-24T10:00:00');
    const partsTo = caviahue.toCaviahue('2026-12-24T14:00:00');
    expect(result.from).toContain(String(partsFrom.localHour).padStart(2, '0') + ':00');
    expect(result.to).toContain(String(partsTo.localHour).padStart(2, '0') + ':00');
  });

  // Regression test: "vie 23:00 a vie 23:00" must be rejected
  it('regression: rejects "vie 23:00 a vie 23:00" (zero duration)', () => {
    // Same ISO timestamp produces the same formatted label
    const result = validateWindow(
      '2026-06-19T23:00:00',
      '2026-06-19T23:00:00',
    );
    expect(result.hasWindow).toBe(false);
    expect(result.description).toBe('No hay una ventana clara de nieve en este período.');
  });
});
