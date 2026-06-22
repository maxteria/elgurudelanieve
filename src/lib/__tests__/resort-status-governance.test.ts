import { describe, it, expect } from 'vitest';
import { generateFallbackNpcMessage } from '../ai/guru-copy';
import { applyNarrativeGovernance } from '../governance/apply-narrative-governance';
import type { GuruCopyInput } from '../ai/guru-copy';
import type { ResortStatus } from '../types';

function makeInput(overrides: Partial<GuruCopyInput> = {}): GuruCopyInput {
  return {
    period: 'today',
    mainAnswer: {
      status: 'yes',
      label: 'Nieve probable',
      description: 'Snow expected',
    },
    powderScore: {
      value: 75,
      label: 'Alto',
      description: 'Good powder potential',
    },
    bestWindow: {
      hasWindow: true,
      from: 'vie 23:00',
      to: 'sáb 05:00',
      label: 'vie 23:00 a sáb 05:00',
      description: 'Best accumulation window',
    },
    alerts: [],
    zones: {
      village: {
        id: 'village',
        current: {
          temp: -2,
          feelsLike: -5,
          wind: 10,
          precipitation: 1.2,
          snowChance: 80,
          freezingLevel: 1500,
          humidity: 70,
          snowDepth: 0.2,
          precipitationProbability: 80,
          weatherCode: 71,
        },
        answer: { label: 'Nieve', status: 'yes', description: 'Snow' },
      },
      mid: {
        id: 'mid',
        current: {
          temp: -4,
          feelsLike: -8,
          wind: 12,
          precipitation: 1.5,
          snowChance: 90,
          freezingLevel: 1400,
          humidity: 75,
          snowDepth: 0.3,
          precipitationProbability: 90,
          weatherCode: 71,
        },
        answer: { label: 'Nieve', status: 'yes', description: 'Snow' },
      },
      top: {
        id: 'top',
        current: {
          temp: -6,
          feelsLike: -10,
          wind: 15,
          precipitation: 1.8,
          snowChance: 95,
          freezingLevel: 1300,
          humidity: 80,
          snowDepth: 0.4,
          precipitationProbability: 95,
          weatherCode: 71,
        },
        answer: { label: 'Nieve', status: 'yes', description: 'Snow' },
      },
    },
    ...overrides,
  } as GuruCopyInput;
}

function makeResortStatus(overrides: Partial<ResortStatus> = {}): ResortStatus {
  return {
    seasonStatus: 'unknown',
    resortOperationalStatus: 'unknown',
    officialSnowReportAvailable: false,
    baseDepthCm: null,
    liftsOpen: 0,
    slopesOpen: 0,
    lastUpdatedAt: '2026-06-19T00:00:00Z',
    updatedBy: 'manual',
    resortStatusSource: 'Manual local',
    operationalWarnings: [],
    ...overrides,
  } as ResortStatus;
}

describe('resort status narrative governance', () => {
  it('does not recommend ski/snowboard during pre_season even if snow is forecast', () => {
    const input = makeInput({
      resortStatus: makeResortStatus({ seasonStatus: 'pre_season' }),
    });
    const result = generateFallbackNpcMessage(input);

    const text = `${result.message} ${result.tip ?? ''}`.toLowerCase();
    expect(text).not.toMatch(
      /\b(esqui[aeáéíóú]|ski|snowboard|tabla|subí|pista|medios)\b/,
    );
    expect(text).toMatch(/nieve meteorológica|nieve en formación|no significa/);
  });

  it('does not claim excellent base when official snow report is unavailable', () => {
    const input = makeInput({
      resortStatus: makeResortStatus({
        seasonStatus: 'open',
        resortOperationalStatus: 'open',
        baseDepthCm: 80,
        officialSnowReportAvailable: false,
      }),
    });
    const result = generateFallbackNpcMessage(input);

    const text = `${result.message} ${result.tip ?? ''}`.toLowerCase();
    expect(text).not.toMatch(
      /base consolidada|base excelente|base suficiente|buena base|base esquiable/,
    );
  });

  it('describes snow in formation when baseDepthCm is null', () => {
    const input = makeInput({
      resortStatus: makeResortStatus({
        seasonStatus: 'open',
        resortOperationalStatus: 'open',
        baseDepthCm: null,
        officialSnowReportAvailable: true,
      }),
    });
    const result = generateFallbackNpcMessage(input);

    const text = `${result.message} ${result.tip ?? ''}`.toLowerCase();
    expect(text).toMatch(/nieve en formación|nieve meteorológica/);
  });

  it('allows moderate ski recommendation when resort is open with sufficient base and official report', () => {
    const input = makeInput({
      resortStatus: makeResortStatus({
        seasonStatus: 'open',
        resortOperationalStatus: 'open',
        baseDepthCm: 80,
        officialSnowReportAvailable: true,
        liftsOpen: 4,
        slopesOpen: 12,
      }),
    });
    const result = generateFallbackNpcMessage(input);

    const text = `${result.message} ${result.tip ?? ''}`.toLowerCase();
    expect(text).toMatch(/buena señal|equipo|ventana/);
    expect(text).not.toMatch(/nieve en formación|no significa/);
  });

  it('does not recommend ski/snowboard when resortStatus is undefined (conservative default)', () => {
    const input = makeInput({}); // no resortStatus provided
    const result = generateFallbackNpcMessage(input);

    const text = `${result.message} ${result.tip ?? ''}`.toLowerCase();
    expect(text).not.toMatch(
      /\b(esqui[aeáéíóú]|ski|snowboard|tabla|subí|pista|medios)\b/,
    );
  });

  it('does not recommend ski/snowboard when resortStatus is incomplete/unknown', () => {
    const input = makeInput({
      resortStatus: makeResortStatus({ seasonStatus: 'unknown', resortOperationalStatus: 'unknown' }),
    });
    const result = generateFallbackNpcMessage(input);

    const text = `${result.message} ${result.tip ?? ''}`.toLowerCase();
    expect(text).not.toMatch(
      /\b(esqui[aeáéíóú]|ski|snowboard|tabla|subí|pista|medios)\b/,
    );
  });

  it('blocks ski recommendation from cached message when resortStatus is undefined', () => {
    const cached = {
      mood: 'good',
      certainty: 'high',
      message: 'Excelente día para esquiar en Caviahue',
      tip: null,
      source: 'cache',
    } as any;

    const result = applyNarrativeGovernance(cached, 'normal', undefined);

    expect(result).not.toBeNull();
    expect(result?.message ?? '').not.toMatch(/esqu[ií]\w*|ski|snowboard|tabla|powder/i);
  });
});
