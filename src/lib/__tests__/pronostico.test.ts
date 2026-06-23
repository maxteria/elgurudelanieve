import { describe, it, expect } from 'vitest';
import {
  safeNum,
  safeInt,
  snowfallToCm,
  roundWind,
  degreesToCardinal,
  windDisplay,
  getTempColor,
  getTempBg,
  getSnowCmColor,
  getRainMmColor,
  getCotaColor,
  getWindColor,
  getDayVerdict,
  getVerdictBadgeStyle,
  getCotaLabel,
  getRainLabel,
  formatDate,
  getGuruCopy,
  ELEVATION_MARGIN,
  isHistoricalRunComplete,
  pickBestHistoricalRun,
  buildHistoricalDayData,
} from '../pronostico';
import type { DayData } from '../pronostico';
import type { ForecastPeriodSummaryRow } from '../supabase/forecast-types';

describe('pronostico number helpers', () => {
  it('safeNum returns null for null, undefined or NaN', () => {
    expect(safeNum(null)).toBeNull();
    expect(safeNum(undefined)).toBeNull();
    expect(safeNum(NaN)).toBeNull();
    expect(safeNum(5)).toBe(5);
  });

  it('safeInt rounds to one decimal', () => {
    expect(safeInt(1.23)).toBe(1.2);
    expect(safeInt(null)).toBeNull();
  });

  it('snowfallToCm rounds to one decimal', () => {
    expect(snowfallToCm(0.123)).toBe(0.1);
    expect(snowfallToCm(null)).toBeNull();
  });

  it('roundWind rounds to multiples of 5 and calms low wind', () => {
    expect(roundWind(0)).toBe(0);
    expect(roundWind(1)).toBe(0);
    expect(roundWind(7)).toBe(5);
    expect(roundWind(12)).toBe(10);
    expect(roundWind(18)).toBe(20);
    expect(roundWind(null)).toBeNull();
  });

  it('degreesToCardinal returns Spanish compass points', () => {
    expect(degreesToCardinal(0)).toBe('N');
    expect(degreesToCardinal(45)).toBe('NE');
    expect(degreesToCardinal(180)).toBe('S');
    expect(degreesToCardinal(315)).toBe('NO');
    expect(degreesToCardinal(null)).toBe('—');
  });

  it('windDisplay shows Calma for zero wind', () => {
    expect(windDisplay(0, 0)).toBe('Calma');
    expect(windDisplay(45, 12)).toBe('NE 10');
  });
});

describe('pronostico style helpers', () => {
  it('getTempColor handles ranges', () => {
    expect(getTempColor(-10)).toContain('sky-400');
    expect(getTempColor(20)).toContain('orange-300');
    expect(getTempColor(null)).toBe('text-white/10');
  });

  it('getSnowCmColor escalates with cm', () => {
    const zero = getSnowCmColor(0);
    expect(zero.text).toContain('blue-300/25');
    const heavy = getSnowCmColor(20);
    expect(heavy.text).toBe('text-hielo');
  });

  it('getCotaColor favors snow when freezing level is near zone altitude', () => {
    const good = getCotaColor(1700, 1647);
    expect(good.text).toContain('cyan-200');
    const bad = getCotaColor(3000, 1647);
    expect(bad.text).toBe('text-white/25');
  });

  it('getWindColor highlights strong wind', () => {
    expect(getWindColor(5)).toContain('white/40');
    expect(getWindColor(30)).toContain('orange-300');
  });
});

describe('pronostico verdict helpers', () => {
  it('getDayVerdict returns Nieve for snow and low freezing level', () => {
    expect(
      getDayVerdict({
        tempMin: -2,
        tempMax: 2,
        totalPrecip: 0,
        totalSnow: 1,
        minFreezingLevel: 2000,
        snowHours: 1,
      }),
    ).toBe('Nieve');
  });

  it('getDayVerdict returns Seco when nothing happens', () => {
    expect(
      getDayVerdict({
        tempMin: 5,
        tempMax: 10,
        totalPrecip: 0,
        totalSnow: 0,
        minFreezingLevel: 3000,
        snowHours: 0,
      }),
    ).toBe('Seco');
  });

  it('getVerdictBadgeStyle returns styles for known verdicts', () => {
    expect(getVerdictBadgeStyle('Nieve').text).toContain('hielo');
    expect(getVerdictBadgeStyle('Seco').text).toContain('white/30');
  });

  it('getCotaLabel matches pronostico thresholds', () => {
    expect(getCotaLabel(2100)).toBe('Baja');
    expect(getCotaLabel(2200)).toBe('Justa');
    expect(getCotaLabel(2600)).toBe('Alta');
  });

  it('getRainLabel escalates precipitation', () => {
    expect(getRainLabel(0)).toBe('Seco');
    expect(getRainLabel(1)).toBe('Llovizna');
    expect(getRainLabel(5)).toBe('Lluvia');
    expect(getRainLabel(25)).toBe('Diluvio');
  });
});

describe('pronostico date helpers', () => {
  it('formatDate returns weekday and day number', () => {
    const result = formatDate('2026-06-20');
    expect(result.dayLabel).toBe('SÁB');
    expect(result.dayNum).toBe('20');
  });
});

describe('getGuruCopy', () => {
  function makeDay(verdict: DayData['verdict']): DayData {
    return {
      dayLabel: 'SÁB',
      dayNum: '20',
      dateStr: '2026-06-20',
      isToday: true,
      isYesterday: false,
      isHistorical: false,
      zoneAltitude: 1647,
      verdict,
      verdictBadgeStyle: getVerdictBadgeStyle(verdict),
      tempMax: 5,
      tempMin: -2,
      periods: [],
    };
  }

  it('returns dry copy when all days are dry', () => {
    const days = [makeDay('Seco'), makeDay('Seco')];
    const copy = getGuruCopy(days, 'Pueblo', false);
    expect(copy).toContain('sin precipitación');
    expect(copy).not.toContain('paquetón');
  });

  it('cumbre copy avoids forbidden word and is cautious when ski not allowed', () => {
    const days = [makeDay('Nieve')];
    const copy = getGuruCopy(days, 'Cumbre', false);
    expect(copy).not.toContain('paquetón');
    expect(copy).toContain('No implica que el centro esté operativo');
  });

  it('cumbre copy is more operational when ski allowed', () => {
    const days = [makeDay('Nieve')];
    const copy = getGuruCopy(days, 'Cumbre', true);
    expect(copy).toContain('Cuando abra el centro');
  });

  it('pueblo copy warns about cota when ski not allowed', () => {
    const days = [makeDay('Nieve')];
    const copy = getGuruCopy(days, 'Pueblo', false);
    expect(copy).toContain('No hay recomendación de actividad en montaña');
  });
});

// ─── Historical Data ─────────────────────────────────────────────────────

function makePeriodRow(overrides: Partial<ForecastPeriodSummaryRow>): ForecastPeriodSummaryRow {
  return {
    id: 1,
    forecast_run_id: 10,
    local_date: '2026-06-21',
    zone: 'village',
    period: 'AM',
    snow_cm: 0,
    rain_mm: 0,
    wind_kmh: 5,
    temp_max: 2,
    temp_min: -3,
    cota_m: 1800,
    humidity_pct: 70,
    cloud_pct: 60,
    period_status: 'Seco',
    ...overrides,
  };
}

describe('isHistoricalRunComplete', () => {
  it('returns true for a full 3zone x 3period dataset', () => {
    const rows: ForecastPeriodSummaryRow[] = [];
    for (const zone of ['village', 'mid', 'top'] as const) {
      for (const period of ['AM', 'PM', 'Noche'] as const) {
        rows.push(makePeriodRow({ zone, period, forecast_run_id: 10 }));
      }
    }
    expect(isHistoricalRunComplete(rows)).toBe(true);
  });

  it('returns false when only 2 zones are present', () => {
    const rows: ForecastPeriodSummaryRow[] = [];
    for (const zone of ['village', 'mid'] as const) {
      for (const period of ['AM', 'PM', 'Noche'] as const) {
        rows.push(makePeriodRow({ zone, period, forecast_run_id: 10 }));
      }
    }
    expect(isHistoricalRunComplete(rows)).toBe(false);
  });

  it('returns false when a zone is missing a period', () => {
    const rows: ForecastPeriodSummaryRow[] = [];
    for (const zone of ['village', 'mid', 'top'] as const) {
      for (const period of ['AM', 'PM', 'Noche'] as const) {
        if (zone === 'top' && period === 'Noche') continue;
        rows.push(makePeriodRow({ zone, period, forecast_run_id: 10 }));
      }
    }
    expect(isHistoricalRunComplete(rows)).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(isHistoricalRunComplete([])).toBe(false);
  });

  it('returns true even with multiple runs if at least one is complete', () => {
    // Run 9: incomplete (only village)
    const rows: ForecastPeriodSummaryRow[] = [];
    for (const period of ['AM', 'PM', 'Noche'] as const) {
      rows.push(makePeriodRow({ zone: 'village', period, forecast_run_id: 9 }));
    }
    // Run 10: complete
    for (const zone of ['village', 'mid', 'top'] as const) {
      for (const period of ['AM', 'PM', 'Noche'] as const) {
        rows.push(makePeriodRow({ zone, period, forecast_run_id: 10 }));
      }
    }
    expect(isHistoricalRunComplete(rows)).toBe(true);
  });
});

describe('pickBestHistoricalRun', () => {
  it('returns null when no run is complete', () => {
    const rows = [
      makePeriodRow({ zone: 'village', period: 'AM', forecast_run_id: 5 }),
      makePeriodRow({ zone: 'village', period: 'PM', forecast_run_id: 5 }),
    ];
    expect(pickBestHistoricalRun(rows)).toBeNull();
  });

  it('returns the most recent complete run', () => {
    const rows: ForecastPeriodSummaryRow[] = [];
    // Run 9: complete
    for (const zone of ['village', 'mid', 'top'] as const) {
      for (const period of ['AM', 'PM', 'Noche'] as const) {
        rows.push(makePeriodRow({ zone, period, forecast_run_id: 9 }));
      }
    }
    // Run 10 (newer): also complete
    for (const zone of ['village', 'mid', 'top'] as const) {
      for (const period of ['AM', 'PM', 'Noche'] as const) {
        rows.push(makePeriodRow({ zone, period, forecast_run_id: 10 }));
      }
    }
    const result = pickBestHistoricalRun(rows);
    expect(result).not.toBeNull();
    // Should have all 3 zones
    expect(Object.keys(result!)).toEqual(
      expect.arrayContaining(['village', 'mid', 'top']),
    );
    // Zone data should be from run 10
    expect(result!.village.every((r) => r.forecast_run_id === 10)).toBe(true);
  });

  it('returns null for empty input', () => {
    expect(pickBestHistoricalRun([])).toBeNull();
  });

  it('uses runOrder when provided (timestamp-sorted from forecast_runs)', () => {
    const rows: ForecastPeriodSummaryRow[] = [];
    // Run 9: complete
    for (const zone of ['village', 'mid', 'top'] as const) {
      for (const period of ['AM', 'PM', 'Noche'] as const) {
        rows.push(makePeriodRow({ zone, period, forecast_run_id: 9 }));
      }
    }
    // Run 99 (higher id but OLDER in runOrder): also complete
    for (const zone of ['village', 'mid', 'top'] as const) {
      for (const period of ['AM', 'PM', 'Noche'] as const) {
        rows.push(makePeriodRow({ zone, period, forecast_run_id: 99 }));
      }
    }

    // runOrder puts run 9 first (simulating run_timestamp DESC)
    const runOrder = [{ id: 9 }, { id: 99 }];
    const result = pickBestHistoricalRun(rows, runOrder);
    expect(result).not.toBeNull();
    // Should pick run 9 because it appears first in runOrder
    expect(result!.village.every((r) => r.forecast_run_id === 9)).toBe(true);
  });

  it('skips incomplete runs in runOrder and picks the first complete one', () => {
    const rows: ForecastPeriodSummaryRow[] = [];
    // Run 1: incomplete (only village)
    for (const period of ['AM', 'PM', 'Noche'] as const) {
      rows.push(makePeriodRow({ zone: 'village', period, forecast_run_id: 1 }));
    }
    // Run 2: complete
    for (const zone of ['village', 'mid', 'top'] as const) {
      for (const period of ['AM', 'PM', 'Noche'] as const) {
        rows.push(makePeriodRow({ zone, period, forecast_run_id: 2 }));
      }
    }

    const runOrder = [{ id: 1 }, { id: 2 }];
    const result = pickBestHistoricalRun(rows, runOrder);
    expect(result).not.toBeNull();
    // Should skip incomplete run 1, pick complete run 2
    expect(result!.village.every((r) => r.forecast_run_id === 2)).toBe(true);
  });

  it('filters out runOrder ids that have no matching data', () => {
    const rows: ForecastPeriodSummaryRow[] = [];
    for (const zone of ['village', 'mid', 'top'] as const) {
      for (const period of ['AM', 'PM', 'Noche'] as const) {
        rows.push(makePeriodRow({ zone, period, forecast_run_id: 42 }));
      }
    }
    // runOrder includes id 999 which has no matching rows
    const runOrder = [{ id: 999 }, { id: 42 }];
    const result = pickBestHistoricalRun(rows, runOrder);
    expect(result).not.toBeNull();
    expect(result!.village.every((r) => r.forecast_run_id === 42)).toBe(true);
  });
});

describe('buildHistoricalDayData', () => {
  const villageRows = [
    makePeriodRow({ zone: 'village', period: 'AM', temp_max: 5, temp_min: -1, snow_cm: 0, rain_mm: 0, wind_kmh: 10, cota_m: 2000, humidity_pct: 60, cloud_pct: 40, period_status: 'Seco' }),
    makePeriodRow({ zone: 'village', period: 'PM', temp_max: 3, temp_min: -2, snow_cm: 1, rain_mm: 0.5, wind_kmh: 15, cota_m: 1800, humidity_pct: 70, cloud_pct: 60, period_status: 'Nieve' }),
    makePeriodRow({ zone: 'village', period: 'Noche', temp_max: -1, temp_min: -5, snow_cm: 3, rain_mm: 1, wind_kmh: 20, cota_m: 1600, humidity_pct: 80, cloud_pct: 80, period_status: 'Nieve' }),
  ];

  it('builds a DayData with isHistorical=true and isYesterday=true', () => {
    const day = buildHistoricalDayData(villageRows, 1647);
    expect(day.isHistorical).toBe(true);
    expect(day.isYesterday).toBe(true);
    expect(day.isToday).toBe(false);
    expect(day.dayLabel).toBe('AYER');
  });

  it('maps period_summary fields to PeriodData fields', () => {
    const day = buildHistoricalDayData(villageRows, 1647);
    expect(day.periods).toHaveLength(3);

    const am = day.periods.find((p) => p.label === 'AM')!;
    expect(am.temp).toBe(5);
    expect(am.feelsLike).toBe(-1);
    expect(am.snowCm).toBe(0);
    expect(am.precip).toBe(0);
    expect(am.periodStatus).toBe('Seco');

    const pm = day.periods.find((p) => p.label === 'PM')!;
    expect(pm.temp).toBe(3);
    expect(pm.snowCm).toBe(1);
    expect(pm.periodStatus).toBe('Nieve');
  });

  it('never returns null values for display — null fields come through as null (rendering handles as "—")', () => {
    const rowsWithNull = [
      makePeriodRow({ zone: 'village', period: 'AM', temp_max: null, wind_kmh: null }),
      makePeriodRow({ zone: 'village', period: 'PM', temp_max: null, snow_cm: null }),
      makePeriodRow({ zone: 'village', period: 'Noche', temp_max: null }),
    ];
    const day = buildHistoricalDayData(rowsWithNull, 1647);
    const am = day.periods.find((p) => p.label === 'AM')!;
    expect(am.temp).toBeNull();
    expect(am.windSpeed).toBeNull();
  });

  it('computes correct verdict from period statuses', () => {
    // PM and Noche have Nieve → verdict should be Nieve
    const day = buildHistoricalDayData(villageRows, 1647);
    expect(day.verdict).toBe('Nieve');
  });

  it('handles all-Seco periods', () => {
    const dryRows = [
      makePeriodRow({ zone: 'village', period: 'AM', period_status: 'Seco' }),
      makePeriodRow({ zone: 'village', period: 'PM', period_status: 'Seco' }),
      makePeriodRow({ zone: 'village', period: 'Noche', period_status: 'Seco' }),
    ];
    const day = buildHistoricalDayData(dryRows, 1647);
    expect(day.verdict).toBe('Seco');
    expect(day.periods.every((p) => p.periodStatus === 'Seco')).toBe(true);
  });

  it('missing periods become empty PeriodData with Seco status', () => {
    const twoRow = [
      makePeriodRow({ zone: 'village', period: 'AM', temp_max: 5 }),
      makePeriodRow({ zone: 'village', period: 'PM', temp_max: 3 }),
      // Missing Noche
    ];
    const day = buildHistoricalDayData(twoRow, 1647);
    const noche = day.periods.find((p) => p.label === 'Noche')!;
    expect(noche.temp).toBeNull();
    expect(noche.periodStatus).toBe('Seco');
  });
});
