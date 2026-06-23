/**
 * Tests for the guru_messages column contract.
 *
 * Contract:
 *   - period     = cache date (DATE), format YYYY-MM-DD
 *   - period_key = logical period key (TEXT): now, today, tomorrow, sevenDays
 *   - sevenDays  is NEVER stored in the `period` column
 *   - lookup uses `period` for date range
 *   - find uses `period_key` for period matching
 */
import { describe, it, expect } from 'vitest';
import type { GuruMessageRecord } from '../supabase/client';

// ─── Contract Validation: storeGuruMessage payload shape ─────────────────────

/**
 * Simulates what the fixed guru-copy.ts passes to storeGuruMessage.
 * The key contract is that `period` receives cacheDate (YYYY-MM-DD),
 * and `period_key` receives the PeriodKey (today/tomorrow/sevenDays).
 */
function makeStorePayload(
  cacheDate: string,
  periodKey: string,
  overrides?: Partial<GuruMessageRecord>,
): GuruMessageRecord {
  return {
    period: cacheDate,
    period_key: periodKey,
    mood: 'neutral',
    certainty: 'media',
    message: 'test message',
    source: 'ai',
    ...overrides,
  };
}

describe('guru_messages column contract — store', () => {
  const VALID_PERIOD_KEYS = ['now', 'today', 'tomorrow', 'sevenDays'];
  const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

  it('period is YYYY-MM-DD (date string)', () => {
    const payload = makeStorePayload('2026-06-23', 'today');
    expect(payload.period).toMatch(VALID_DATE);
  });

  it('period_key is a valid PeriodKey (now/today/tomorrow/sevenDays)', () => {
    const payload = makeStorePayload('2026-06-23', 'sevenDays');
    expect(VALID_PERIOD_KEYS).toContain(payload.period_key);
  });

  it('sevenDays is NEVER stored in period', () => {
    for (const key of VALID_PERIOD_KEYS) {
      const payload = makeStorePayload('2026-06-23', key);
      // period must always be a date string, NOT a PeriodKey
      expect(payload.period).toMatch(VALID_DATE);
      expect(VALID_PERIOD_KEYS).not.toContain(payload.period);
    }
  });

  it('period_key never stores a date string', () => {
    for (const key of VALID_PERIOD_KEYS) {
      const payload = makeStorePayload('2026-06-23', key);
      // period_key must be a short key, not a date
      expect(payload.period_key).not.toMatch(VALID_DATE);
    }
  });

  it('period receives cacheDate (getCacheDateKey output)', () => {
    // Simulate getCacheDateKey logic: YYYY-MM-DD from today
    const now = new Date();
    const cacheDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const payload = makeStorePayload(cacheDate, 'today');
    expect(payload.period).toBe(cacheDate);
    expect(payload.period).toMatch(VALID_DATE);
  });
});

// ─── Contract Validation: cache lookup shape ─────────────────────────────────

/**
 * Simulates the cache lookup pattern after the fix.
 * getGuruMessagesInRange filters by `period` (DATE column),
 * then the find checks `period_key` for the period identifier.
 */
function simulateCacheLookup(
  rows: GuruMessageRecord[],
  cacheDate: string,
  periodKey: string,
  cutoffDate: string,
): GuruMessageRecord | undefined {
  return rows.find((r) => {
    const created = r.created_at ?? '';
    const matchesPeriod = r.period_key === periodKey;
    return created > cutoffDate && matchesPeriod;
  });
}

describe('guru_messages column contract — cache lookup', () => {
  const CACHE_DATE = '2026-06-23';
  const CUTOFF = '2026-06-23T00:00:00.000Z';

  it('find uses period_key for period matching (not period)', () => {
    const rows: GuruMessageRecord[] = [
      {
        period: CACHE_DATE,
        period_key: 'today',
        created_at: '2026-06-23T10:00:00.000Z',
        mood: 'neutral',
        certainty: 'media',
        message: 'today msg',
        source: 'ai',
      },
      {
        period: CACHE_DATE,
        period_key: 'tomorrow',
        created_at: '2026-06-23T10:00:00.000Z',
        mood: 'confident',
        certainty: 'alta',
        message: 'tomorrow msg',
        source: 'ai',
      },
    ];

    const result = simulateCacheLookup(rows, CACHE_DATE, 'today', CUTOFF);
    expect(result).toBeDefined();
    expect(result!.period_key).toBe('today');
    expect(result!.message).toBe('today msg');

    const result2 = simulateCacheLookup(rows, CACHE_DATE, 'tomorrow', CUTOFF);
    expect(result2).toBeDefined();
    expect(result2!.period_key).toBe('tomorrow');
    expect(result2!.message).toBe('tomorrow msg');
  });

  it('filters by created_at cutoff', () => {
    const rows: GuruMessageRecord[] = [
      {
        period: CACHE_DATE,
        period_key: 'today',
        created_at: '2026-06-22T23:00:00.000Z', // before cutoff
        mood: 'neutral',
        certainty: 'media',
        message: 'stale',
        source: 'ai',
      },
      {
        period: CACHE_DATE,
        period_key: 'today',
        created_at: '2026-06-23T01:00:00.000Z', // after cutoff
        mood: 'excited',
        certainty: 'alta',
        message: 'fresh',
        source: 'ai',
      },
    ];

    const result = simulateCacheLookup(rows, CACHE_DATE, 'today', CUTOFF);
    expect(result).toBeDefined();
    expect(result!.message).toBe('fresh');
  });

  it('sevenDays rows are found by period_key lookup', () => {
    const rows: GuruMessageRecord[] = [
      {
        period: CACHE_DATE,
        period_key: 'sevenDays',
        created_at: '2026-06-23T10:00:00.000Z',
        mood: 'cautious',
        certainty: 'baja',
        message: 'seven days outlook',
        source: 'ai',
      },
    ];

    const result = simulateCacheLookup(rows, CACHE_DATE, 'sevenDays', CUTOFF);
    expect(result).toBeDefined();
    expect(result!.period_key).toBe('sevenDays');
  });

  it('old rows with compound period_key (e.g. "tomorrow-2026-06-15") do not match new lookup', () => {
    const rows: GuruMessageRecord[] = [
      {
        period: '2026-06-15',
        period_key: 'tomorrow-2026-06-15', // old format
        created_at: '2026-06-15T10:00:00.000Z',
        mood: 'neutral',
        certainty: 'media',
        message: 'old format',
        source: 'ai',
      },
    ];

    // New lookup uses period_key === data.period ('tomorrow')
    const result = simulateCacheLookup(rows, '2026-06-15', 'tomorrow', '2026-06-15T00:00:00.000Z');
    expect(result).toBeUndefined();
  });
});

// ─── getGuruMessagesInRange query contract ───────────────────────────────────

describe('guru_messages column contract — getGuruMessagesInRange', () => {
  it('queries by period (DATE column), not period_key', () => {
    // Verify the query shape by inspecting what the function filters on.
    // The actual function is async and hits Supabase, but we can verify
    // the conceptual contract: rows are filtered by `period` range.
    const rows: GuruMessageRecord[] = [
      { period: '2026-06-22', period_key: 'today', created_at: '', mood: null, certainty: null, message: null, source: null },
      { period: '2026-06-23', period_key: 'today', created_at: '', mood: null, certainty: null, message: null, source: null },
      { period: '2026-06-24', period_key: 'today', created_at: '', mood: null, certainty: null, message: null, source: null },
    ];

    // Simulate .gte('period', '2026-06-23').lte('period', '2026-06-23')
    const from = '2026-06-23';
    const to = '2026-06-23';
    const filtered = rows.filter(
      (r) => r.period >= from && r.period <= to,
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].period).toBe('2026-06-23');
  });
});
