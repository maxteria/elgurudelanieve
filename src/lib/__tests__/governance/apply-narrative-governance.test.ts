import { describe, it, expect } from 'vitest';
import { applyNarrativeGovernance } from '../../governance/apply-narrative-governance';
import type { GuruNpcOutput } from '../../ai/types';
import type { ResortStatus } from '../../types';

function makeOutput(message: string, tip: string | null = null): GuruNpcOutput {
  return {
    mood: 'neutral',
    certainty: 'baja',
    message,
    tip,
    source: 'ai',
  };
}

function makeResortStatus(overrides: Partial<ResortStatus> = {}): ResortStatus {
  return {
    seasonStatus: 'pre_season',
    resortOperationalStatus: 'closed',
    officialSnowReportAvailable: false,
    baseDepthCm: null,
    liftsOpen: 0,
    slopesOpen: 0,
    lastUpdatedAt: '2026-06-20T00:00:00Z',
    updatedBy: 'manual',
    resortStatusSource: 'test',
    operationalWarnings: [],
    ...overrides,
  } as ResortStatus;
}

describe('applyNarrativeGovernance', () => {
  it('blocks prohibited marketing phrases (powder day) under pre-season/closed', () => {
    const out = makeOutput('It will be a powder day, prepare your skis!');
    const res = applyNarrativeGovernance(out, 'normal', makeResortStatus());
    expect(res).toBeNull();
  });

  it('sanitizes imperative ski instructions (prepare/sharpen/store skis) under restricted resort status', () => {
    const out = makeOutput('Prepare your skis and sharpen edges before the trip.');
    const res = applyNarrativeGovernance(out, 'normal', makeResortStatus());
    expect(res).not.toBeNull();
    expect(res?.message ?? '').not.toMatch(/esqu[ií]\w*|ski|snowboard|tabla|powder/i);
  });

  it('sanitizes claims about excellent base when official report unavailable', () => {
    const out = makeOutput('Base excellent: perfect corduroy and consolidated base.');
    const res = applyNarrativeGovernance(out, 'normal', makeResortStatus());
    expect(res).not.toBeNull();
    expect(res?.message ?? '').not.toMatch(/base (excelente|consolidada|perfecta)/i);
  });

  it('allows meteorological snow language even when ski recommendations are blocked', () => {
    const out = makeOutput('There is meteorological snow in formation above the summit.');
    const res = applyNarrativeGovernance(out, 'normal', makeResortStatus());
    expect(res).not.toBeNull();
  });

  it('blocks message containing both meteorological phrase and prohibited ski phrase', () => {
    const out = makeOutput('Meteorological snow in formation — powder day guaranteed, prepare your skis!');
    const res = applyNarrativeGovernance(out, 'normal', makeResortStatus());
    expect(res).toBeNull();
  });

  it('blocks ski recommendation when resortStatus is undefined (conservative default)', () => {
    const out = makeOutput('Prepare your skis and head up the mountain.');
    const res = applyNarrativeGovernance(out, 'normal', undefined);
    expect(res).not.toBeNull();
    expect(res?.message ?? '').not.toMatch(/esqu[ií]\w*|ski|snowboard|tabla|powder/i);
  });

  it('blocks ski recommendation when resortStatus is incomplete/unknown', () => {
    const incomplete = makeResortStatus({ seasonStatus: 'unknown', resortOperationalStatus: 'unknown' });
    const out = makeOutput('Prepare your skis and head up the mountain.');
    const res = applyNarrativeGovernance(out, 'normal', incomplete);
    expect(res).not.toBeNull();
    expect(res?.message ?? '').not.toMatch(/esqu[ií]\w*|ski|snowboard|tabla|powder/i);
  });
});
