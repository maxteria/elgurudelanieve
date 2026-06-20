import { describe, it, expect } from 'vitest';
import { toCaviahue, formatCaviahueHour, getCaviahueDayKey } from '../../time/caviahue-time';

describe('caviahue-time helpers', () => {
  it('converts UTC to caviahue local hour and ISO', () => {
    const ts = '2026-06-13T03:00:00Z';
    const res = toCaviahue(ts);
    expect(res.utcIso).toBe(new Date(ts).toISOString());
    // Argentina is UTC-3 in 2026 (no DST), so 03:00Z => 00:00 local
    expect(res.localHour).toBe(0);
    expect(res.localIso.startsWith('2026-06-13T00:00')).toBe(true);
  });

  it('formats hour and day key consistently', () => {
    const ts = '2026-06-13T15:30:00Z';
    const hour = formatCaviahueHour(ts);
    const dayKey = getCaviahueDayKey(ts);
    // 15:30Z -> 12:30 local (UTC-3)
    expect(hour).toBe('12:00');
    expect(dayKey).toBe('2026-06-13');
  });
});
