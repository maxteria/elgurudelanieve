import { describe, it, expect } from 'vitest';
import { buildMasterVerdict } from '../master-verdict';
import type {
  PeriodInterpretations,
  PeriodInterpretation,
} from '../types';

function makePeriod(
  status: PeriodInterpretation['mainAnswer']['status'],
  snowLabel: string,
  freezingLevel: number | null,
  cloudCover: number | null,
  seasonStatus: PeriodInterpretation['resortStatus']['seasonStatus'] = 'pre_season',
): PeriodInterpretation {
  return {
    mainAnswer: {
      status,
      label:
        status === 'yes'
          ? 'Nieve esperada'
          : status === 'possible'
            ? 'Nieve posible'
            : 'Sin nieve',
      description:
        status === 'yes'
          ? 'Hay señal de nieve meteorológica.'
          : status === 'possible'
            ? 'Puede haber nieve meteorológica.'
            : 'No hay señal de nieve meteorológica.',
    },
    snowLabel: snowLabel as PeriodInterpretation['snowLabel'],
    powderScore: {
      value: 0,
      label: 'Bajo',
      description: 'Score bajo',
    },
    updated: '2026-06-20T12:00:00Z',
    bestWindow: {
      hasWindow: false,
      label: 'Sin ventana',
      description: 'No hay ventana clara.',
    },
    zones: {
      village: {
        id: 'village',
        label: 'Pueblo',
        altitude: 1647,
        current: {
          temp: null,
          feelsLike: null,
          wind: null,
          precipitation: null,
          snowChance: null,
          freezingLevel,
          humidity: null,
          snowDepth: null,
          precipitationProbability: null,
          weatherCode: null,
        },
        answer: { status: 'no', label: 'Sin nieve' },
        alerts: [],
      },
      mid: {
        id: 'mid',
        label: 'Centro',
        altitude: 1846,
        current: {
          temp: null,
          feelsLike: null,
          wind: null,
          precipitation: null,
          snowChance: null,
          freezingLevel,
          humidity: null,
          snowDepth: null,
          precipitationProbability: null,
          weatherCode: null,
        },
        answer: { status: 'no', label: 'Sin nieve' },
        alerts: [],
      },
      top: {
        id: 'top',
        label: 'Cumbre',
        altitude: 2045,
        current: {
          temp: null,
          feelsLike: null,
          wind: null,
          precipitation: null,
          snowChance: null,
          freezingLevel,
          humidity: null,
          snowDepth: null,
          precipitationProbability: null,
          weatherCode: null,
        },
        answer: { status: 'no', label: 'Sin nieve' },
        alerts: [],
      },
    },
    alerts: [],
    guruSummary: 'Resumen',
    sourceStatus: { openMeteo: 'ok', weatherApi: 'ok', aic: 'ok' },
    degraded: false,
    narrativeTier: 'normal',
    resortStatus: {
      seasonStatus,
      resortOperationalStatus: seasonStatus === 'open' ? 'open' : 'closed',
      officialSnowReportAvailable: false,
      baseDepthCm: null,
      liftsOpen: null,
      slopesOpen: null,
      lastUpdatedAt: '2026-06-20T12:00:00Z',
      updatedBy: 'manual',
      resortStatusSource: 'test-fixture',
      operationalWarnings: [],
    },
  };
}

describe('buildMasterVerdict', () => {
  it('normalizes forbidden snow labels', () => {
    const periods = {
      today: makePeriod('yes', 'se viene un paquetón', 1800, null),
      tomorrow: makePeriod('no', 'sin nieve a la vista', 2000, null),
      sevenDays: makePeriod('no', 'sin nieve a la vista', 2000, null),
    } as PeriodInterpretations;
    const verdict = buildMasterVerdict(periods, 'today');
    expect(verdict.snowLabel).toBe('nevada importante');
    expect(verdict.snowLabel).not.toContain('paquetón');
  });

  it('never promises clear skies when cloudCover >= 40%', () => {
    const periods = {
      today: makePeriod('no', 'sin nieve a la vista', 2000, 60),
      tomorrow: makePeriod('no', 'sin nieve a la vista', 2000, 60),
      sevenDays: makePeriod('no', 'sin nieve a la vista', 2000, 60),
    } as PeriodInterpretations;
    const verdict = buildMasterVerdict(periods, 'today', 60);
    expect(verdict.isClearSky).toBe(false);
    expect(verdict.skyLabel).toBe('parcialmente nublado');
    expect(verdict.skyLabel).not.toBe('despejado');
  });

  it('classifies freezing level correctly', () => {
    const periods = {
      today: makePeriod('no', 'sin nieve a la vista', 2800, null),
      tomorrow: makePeriod('no', 'sin nieve a la vista', 2800, null),
      sevenDays: makePeriod('no', 'sin nieve a la vista', 2800, null),
    } as PeriodInterpretations;
    const verdict = buildMasterVerdict(periods, 'today');
    expect(verdict.cotaLabel).toBe('Cota alta');
  });

  it('detects closed ski season', () => {
    const periods = {
      today: makePeriod('yes', 'nieve moderada', 1800, null, 'pre_season'),
      tomorrow: makePeriod('no', 'sin nieve a la vista', 2000, null, 'pre_season'),
      sevenDays: makePeriod('no', 'sin nieve a la vista', 2000, null, 'pre_season'),
    } as PeriodInterpretations;
    const verdict = buildMasterVerdict(periods, 'today');
    expect(verdict.isSkiSeasonOpen).toBe(false);
  });

  it('detects open ski season', () => {
    const periods = {
      today: makePeriod('yes', 'nieve moderada', 1800, null, 'open'),
      tomorrow: makePeriod('no', 'sin nieve a la vista', 2000, null, 'open'),
      sevenDays: makePeriod('no', 'sin nieve a la vista', 2000, null, 'open'),
    } as PeriodInterpretations;
    const verdict = buildMasterVerdict(periods, 'today');
    expect(verdict.isSkiSeasonOpen).toBe(true);
  });
});
