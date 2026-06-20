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
} from '../pronostico';
import type { DayData } from '../pronostico';

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
