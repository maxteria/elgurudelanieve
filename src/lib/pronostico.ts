// Utilities for pronostico page
import type { DailySummary, NormalizedHourlyForecast } from './weather/types';
import type { ForecastPeriodSummaryRow } from './supabase/forecast-types';
import { getCaviahueDayKey } from './time/caviahue-time';

// ─── Constants ──────────────────────────────────────────────────────────────

export const WEEKDAYS_SHORT = [
  'DOM',
  'LUN',
  'MAR',
  'MIÉ',
  'JUE',
  'VIE',
  'SÁB',
] as const;

export const ZONE_CONFIG = {
  village: { altitude: 1647, label: 'Pueblo' },
  mid: { altitude: 1846, label: 'Centro' },
  top: { altitude: 2045, label: 'Cumbre' },
} as const;

export const ELEVATION_MARGIN = 150;

export const ROWS = [
  { key: 'nieve', label: 'Nieve', unit: 'cm', rowStyle: 'nieve', group: 'primary' },
  { key: 'lluvia', label: 'Lluvia', unit: 'mm', rowStyle: 'lluvia', group: 'primary' },
  { key: 'viento', label: 'Viento', unit: 'km/h', group: 'secondary' },
  { key: 'tempMax', label: 'Máx', unit: '°', group: 'temp' },
  { key: 'tempMin', label: 'Mín', unit: '°', group: 'temp' },
  { key: 'cota', label: 'Cota', unit: 'm', group: 'secondary' },
  { key: 'humedad', label: 'Hum', unit: '%', group: 'secondary' },
  { key: 'nubosidad', label: 'Nub', unit: '%', group: 'secondary' },
] as const;

export const PERIOD_LABELS = ['AM', 'PM', 'Noche'] as const;

// ─── Types ──────────────────────────────────────────────────────────────────

export type PeriodData = {
  label: string;
  temp: number | null;
  feelsLike: number | null;
  precip: number | null;
  snowCm: number | null;
  windDir: number | null;
  windSpeed: number | null;
  humidity: number | null;
  cloud: number | null;
  cota: number | null;
  periodStatus: 'Seco' | 'Llovizna' | 'Lluvia' | 'Lluvia fuerte' | 'Diluvio' | 'Nieve';
};

export type DayData = {
  dayLabel: string;
  dayNum: string;
  dateStr: string;
  isToday: boolean;
  isYesterday: boolean;
  isHistorical: boolean;
  zoneAltitude: number;
  verdict: 'Seco' | 'Lluvia' | 'Ventana' | 'Nieve' | 'Mezcla';
  verdictBadgeStyle: { bg: string; text: string };
  tempMax: number;
  tempMin: number;
  periods: PeriodData[];
};

// ─── Date Helpers ───────────────────────────────────────────────────────────

export function toLocalDateKey(isoString: string): string {
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPeriodLabel(hour: number): string {
  if (hour >= 0 && hour < 6) return 'Noche';
  if (hour >= 6 && hour < 12) return 'AM';
  if (hour >= 12 && hour < 18) return 'PM';
  return 'Noche';
}

export function formatDate(dateStr: string): { dayLabel: string; dayNum: string } {
  const d = new Date(dateStr + 'T12:00:00');
  const dayIdx = d.getDay();
  const day = d.getDate();
  return { dayLabel: WEEKDAYS_SHORT[dayIdx], dayNum: String(day) };
}

// ─── Number Helpers ─────────────────────────────────────────────────────────

export function safeNum(val: number | null | undefined): number | null {
  if (val == null || isNaN(val)) return null;
  return val;
}

export function safeInt(val: number | null | undefined): number | null {
  if (val == null || isNaN(val)) return null;
  return Math.round(val * 10) / 10;
}

export function snowfallToCm(val: number | null): number | null {
  if (val == null || isNaN(val)) return null;
  return Math.round(val * 10) / 10;
}

export function roundWind(val: number | null): number | null {
  if (val == null || isNaN(val)) return null;
  if (val <= 2) return 0;
  return Math.round(val / 5) * 5;
}

export function degreesToCardinal(deg: number | null): string {
  if (deg == null || isNaN(deg)) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}

export function windDisplay(dir: number | null, speed: number | null): string {
  const dirStr = degreesToCardinal(dir);
  const speedVal = roundWind(speed);
  if (speedVal === 0) return 'Calma';
  return `${dirStr} ${speedVal}`;
}

// ─── Color/Style Helpers ───────────────────────────────────────────────────

export function getTempColor(temp: number | null): string {
  if (temp == null) return 'text-white/10';
  if (temp <= -6) return 'text-sky-400';
  if (temp <= -1) return 'text-sky-300';
  if (temp <= 2) return 'text-cyan-300';
  if (temp <= 7) return 'text-teal-300';
  if (temp <= 14) return 'text-amber-200';
  return 'text-orange-300';
}

export function getTempBg(temp: number | null): string {
  if (temp == null) return 'bg-transparent';
  if (temp <= -6) return 'bg-sky-500/10';
  if (temp <= -1) return 'bg-sky-400/8';
  if (temp <= 2) return 'bg-cyan-400/8';
  if (temp <= 7) return 'bg-teal-400/6';
  if (temp <= 14) return 'bg-amber-400/6';
  return 'bg-orange-400/6';
}

export function getSnowCmColor(cm: number | null): { text: string; bg: string } {
  if (cm == null) return { text: 'text-white/10', bg: 'bg-transparent' };
  if (cm === 0) return { text: 'text-blue-300/25', bg: 'bg-cyan-500/[0.04]' };
  if (cm <= 1) return { text: 'text-blue-300/50', bg: 'bg-cyan-500/[0.06]' };
  if (cm <= 3) return { text: 'text-blue-300/75', bg: 'bg-cyan-500/[0.10]' };
  if (cm <= 7) return { text: 'text-cyan-300', bg: 'bg-cyan-500/[0.14]' };
  if (cm <= 12) return { text: 'text-cyan-200', bg: 'bg-cyan-500/[0.20]' };
  return { text: 'text-hielo', bg: 'bg-hielo/18' };
}

export function getRainMmColor(mm: number | null): { text: string; bg: string } {
  if (mm == null) return { text: 'text-white/10', bg: 'bg-transparent' };
  if (mm === 0) return { text: 'text-white/20', bg: 'bg-sky-500/[0.04]' };
  if (mm <= 1) return { text: 'text-blue-300/45', bg: 'bg-sky-500/[0.07]' };
  if (mm <= 3) return { text: 'text-blue-300/70', bg: 'bg-sky-500/[0.12]' };
  if (mm <= 7) return { text: 'text-blue-300', bg: 'bg-sky-500/[0.18]' };
  return { text: 'text-blue-200', bg: 'bg-sky-500/[0.24]' };
}

export function getCotaColor(cota: number | null, zoneAltitude: number): { text: string; bg: string } {
  if (cota == null) return { text: 'text-white/15', bg: 'bg-transparent' };
  const limit = zoneAltitude + ELEVATION_MARGIN;
  const mid = zoneAltitude + 400;
  if (cota <= limit) return { text: 'text-cyan-200', bg: 'bg-cyan-500/[0.12]' };
  if (cota <= mid) return { text: 'text-cyan-300/70', bg: 'bg-cyan-500/[0.06]' };
  return { text: 'text-white/25', bg: 'bg-transparent' };
}

export function getWindColor(speed: number | null): string {
  if (speed == null || speed === 0) return 'text-white/20';
  if (speed <= 10) return 'text-white/40';
  if (speed <= 25) return 'text-amber-200/50';
  return 'text-orange-300/60';
}

export function getDayVerdict(day: {
  tempMin: number;
  tempMax: number;
  totalPrecip: number;
  totalSnow: number;
  minFreezingLevel: number;
  snowHours: number;
}): string {
  if (day.totalSnow > 0 && day.minFreezingLevel < 2200) return 'Nieve';
  if (day.totalSnow > 0 && day.minFreezingLevel < 2600) return 'Ventana';
  if (day.totalPrecip > 2) return 'Precip';
  if (day.totalPrecip > 0.5) return 'Llovizna';
  if (day.snowHours > 0) return 'Mezcla';
  return 'Seco';
}

export function getVerdictBadgeStyle(verdict: string): { bg: string; text: string } {
  if (verdict === 'Nieve') return { bg: 'bg-hielo/15', text: 'text-hielo' };
  if (verdict === 'Ventana') return { bg: 'bg-hielo/10', text: 'text-hielo/70' };
  if (verdict === 'Lluvia') return { bg: 'bg-white/8', text: 'text-white/60' };
  if (verdict === 'Mezcla') return { bg: 'bg-white/5', text: 'text-white/50' };
  return { bg: 'bg-white/4', text: 'text-white/30' };
}

export function getCotaLabel(freezingLevel: number): string {
  if (freezingLevel < 2200) return 'Baja';
  if (freezingLevel < 2600) return 'Justa';
  return 'Alta';
}

export function getRainLabel(mm: number): string {
  if (mm <= 0) return 'Seco';
  if (mm < 2) return 'Llovizna';
  if (mm < 8) return 'Lluvia';
  if (mm < 20) return 'Lluvia fuerte';
  return 'Diluvio';
}

// ─── Data Building ─────────────────────────────────────────────────────────

export function buildDaysData(
  days: DailySummary[],
  hourly: NormalizedHourlyForecast[],
  zoneAltitude: number,
): DayData[] {
  const todayKey = getCaviahueDayKey(new Date().toISOString());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = getCaviahueDayKey(yesterdayDate.toISOString());

  return days.slice(0, 16).map((day) => {
    const { dayLabel, dayNum } = formatDate(day.date);
    const isToday = day.date === todayKey;
    const isYesterday = day.date === yesterdayKey;
    const finalDayLabel = isYesterday ? 'AYER' : dayLabel;

    const zoneOffset = (zoneAltitude - 1647) * 0.0065;

    const hourByPeriod = new Map<string, NormalizedHourlyForecast[]>();
    for (const h of hourly) {
      const key = getCaviahueDayKey(h.time);
      if (key !== day.date) continue;
      const hour = new Date(h.time).getHours();
      const label = getPeriodLabel(hour);
      if (!hourByPeriod.has(label)) hourByPeriod.set(label, []);
      hourByPeriod.get(label)!.push(h);
    }

    const periodLabels = ['AM', 'PM', 'Noche'];
    const periods: PeriodData[] = periodLabels.map((label) => {
      const hrs = hourByPeriod.get(label) || [];
      if (hrs.length === 0) {
        return {
          label,
          temp: null,
          feelsLike: null,
          precip: null,
          snowCm: null,
          windDir: null,
          windSpeed: null,
          humidity: null,
          cloud: null,
          cota: null,
          periodStatus: 'Seco' as const,
        };
      }
      const temps = hrs.map((h) => h.temp - zoneOffset);
      const temp = safeNum(
        Math.round(temps.reduce((s, v) => s + v, 0) / temps.length),
      );
      const feelsLike = safeNum(
        Math.round(hrs.reduce((s, h) => s + h.feelsLike, 0) / hrs.length),
      );

      let totalPrecip = 0;
      let totalSnowCm = 0;
      for (const h of hrs) {
        const snowLine = h.freezingLevel;
        const canSnowAtElevation = snowLine <= zoneAltitude + ELEVATION_MARGIN;
        const snowfallVal = snowfallToCm(safeInt(h.snowfall));
        const precipVal = safeInt(h.precipitation) ?? 0;
        if (canSnowAtElevation && snowfallVal != null && snowfallVal > 0) {
          totalSnowCm += snowfallVal;
          totalPrecip += precipVal;
        } else {
          totalPrecip += precipVal;
        }
      }
      const precip = safeNum(Math.round(totalPrecip * 10) / 10);
      const snowCm = safeNum(Math.round(totalSnowCm * 10) / 10);

      let periodStatus: PeriodData['periodStatus'] = 'Seco';
      if (precip !== null && precip > 0) {
        if (snowCm !== null && snowCm > 0) {
          periodStatus = 'Nieve';
        } else {
          periodStatus = getRainLabel(precip) as PeriodData['periodStatus'];
        }
      }

      const windDirs = hrs.map((h) => h.windDir);
      const windDir = safeNum(
        Math.round(windDirs.reduce((s, v) => s + v, 0) / windDirs.length),
      );
      const windSpeed = safeNum(
        Math.round(hrs.reduce((s, h) => s + h.wind, 0) / hrs.length),
      );
      const humidity = safeNum(
        Math.round(hrs.reduce((s, h) => s + h.humidity, 0) / hrs.length),
      );
      const cloud = safeNum(
        Math.round(hrs.reduce((s, h) => s + h.cloudCover, 0) / hrs.length),
      );
      const cotas = hrs.map((h) => h.freezingLevel);
      const cota = safeNum(Math.round(Math.min(...cotas)));

      return {
        label,
        temp,
        feelsLike,
        precip,
        snowCm,
        windDir,
        windSpeed,
        humidity,
        cloud,
        cota,
        periodStatus,
      };
    });

    const hasNieve = periods.some((p) => p.periodStatus === 'Nieve');
    const hasLluvia = periods.some((p) =>
      ['Llovizna', 'Lluvia', 'Lluvia fuerte', 'Diluvio'].includes(p.periodStatus),
    );
    const allSeco = periods.every((p) => p.periodStatus === 'Seco');

    let verdict: 'Seco' | 'Llovizna' | 'Lluvia' | 'Lluvia fuerte' | 'Diluvio' | 'Nieve' | 'Mezcla' = 'Seco';
    if (allSeco) {
      verdict = 'Seco';
    } else if (hasNieve && hasLluvia) {
      verdict = 'Mezcla';
    } else if (hasNieve) {
      verdict = 'Nieve';
    } else {
      const rainVerdicts = periods
        .filter((p) => p.periodStatus !== 'Seco')
        .map((p) => p.periodStatus);
      verdict = rainVerdicts[0] ?? 'Seco';
    }

    const verdictBadgeStyle = getVerdictBadgeStyle(verdict);

    return {
      dayLabel: finalDayLabel,
      dayNum,
      dateStr: day.date,
      isToday,
      isYesterday,
      isHistorical: false,
      zoneAltitude,
      verdict,
      verdictBadgeStyle,
      tempMax: Math.round(day.tempMax),
      tempMin: Math.round(day.tempMin),
      periods,
    };
  });
}

// ─── Guru Copy ──────────────────────────────────────────────────────────────

export function getGuruCopy(
  days: DayData[],
  zoneLabel: string,
  skiAllowed = false,
): string {
  const hasPrecip = days.some((d) => d.verdict !== 'Seco');
  if (!hasPrecip)
    return `Los próximos ${days.length} días no me entusiasmo demasiado. Aparece frío por momentos, pero sin precipitación la montaña no arma nieve.`;
  if (zoneLabel === 'Cumbre')
    return `Arriba hay mejor señal. No canto nevada grande, pero algunas ventanas pueden caer como nieve si se sostiene la cota.${skiAllowed ? ' Cuando abra el centro, estas son las condiciones que hay que monitorear.' : ' No implica que el centro esté operativo.'}`;
  if (zoneLabel === 'Centro')
    return `En el centro la cosa mejora un poco, pero todavía depende mucho de que la cota acompañe.${skiAllowed ? '' : ' La temporada todavía no está operativa.'}`;
   return `Hay señales para mirar hacia mitad de semana, pero abajo la cota manda. Si no baja más, lo leo más como lluvia que como nieve para el pueblo.${skiAllowed ? '' : ' No hay recomendación de actividad en montaña.'}`;
}

// ─── Historical Data ────────────────────────────────────────────────────────

/**
 * Check whether a set of forecast_period_summaries rows for a single date
 * is "complete" — meaning it has at least 3 zones × 3 periods.
 * Only complete runs are used to reconstruct yesterday from history.
 */
export function isHistoricalRunComplete(
  rows: ForecastPeriodSummaryRow[],
): boolean {
  const zonePeriods = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!zonePeriods.has(row.zone)) zonePeriods.set(row.zone, new Set());
    zonePeriods.get(row.zone)!.add(row.period);
  }
  // Must have all 3 zones, each with all 3 periods
  const zones = ['village', 'mid', 'top'];
  for (const z of zones) {
    const periods = zonePeriods.get(z);
    if (!periods || periods.size < 3) return false;
  }
  return true;
}

/**
 * Given raw forecast_period_summaries rows for yesterday (multiple runs),
 * find the most recent run that has complete data and return it grouped by zone.
 */
export function pickBestHistoricalRun(
  rows: ForecastPeriodSummaryRow[],
): Record<string, ForecastPeriodSummaryRow[]> | null {
  // Group by forecast_run_id
  const runs = new Map<number, ForecastPeriodSummaryRow[]>();
  for (const row of rows) {
    if (!runs.has(row.forecast_run_id)) runs.set(row.forecast_run_id, []);
    runs.get(row.forecast_run_id)!.push(row);
  }

  // Sort by run_id descending (most recent first) and find first complete one
  const sortedIds = Array.from(runs.keys()).sort((a, b) => b - a);
  for (const runId of sortedIds) {
    const runRows = runs.get(runId)!;
    if (!isHistoricalRunComplete(runRows)) continue;

    // Group by zone for this complete run
    const byZone: Record<string, ForecastPeriodSummaryRow[]> = {};
    for (const row of runRows) {
      if (!byZone[row.zone]) byZone[row.zone] = [];
      byZone[row.zone].push(row);
    }
    return byZone;
  }

  return null;
}

/**
 * Build a DayData for one zone from historical forecast_period_summaries rows.
 * `rows` must be all period summaries for a single zone + single date (3 rows: AM, PM, Noche).
 */
export function buildHistoricalDayData(
  rows: ForecastPeriodSummaryRow[],
  zoneAltitude: number,
): DayData {
  const dateStr = rows[0]?.local_date ?? '';
  const { dayLabel, dayNum } = formatDate(dateStr);

  // Group by period
  const periodMap = new Map<string, ForecastPeriodSummaryRow>();
  for (const r of rows) {
    periodMap.set(r.period, r);
  }

  const periods: PeriodData[] = PERIOD_LABELS.map((label) => {
    const row = periodMap.get(label);
    if (!row) {
      return {
        label,
        temp: null,
        feelsLike: null,
        precip: null,
        snowCm: null,
        windDir: null,
        windSpeed: null,
        humidity: null,
        cloud: null,
        cota: null,
        periodStatus: 'Seco' as const,
      };
    }
    return {
      label,
      temp: row.temp_max,
      feelsLike: row.temp_min,
      precip: row.rain_mm,
      snowCm: row.snow_cm,
      windDir: null, // wind direction not stored in period summaries
      windSpeed: row.wind_kmh,
      humidity: row.humidity_pct,
      cloud: row.cloud_pct,
      cota: row.cota_m,
      periodStatus: (row.period_status ?? 'Seco') as PeriodData['periodStatus'],
    };
  });

  // Compute verdict (same logic as buildDaysData)
  const hasNieve = periods.some((p) => p.periodStatus === 'Nieve');
  const hasLluvia = periods.some((p) =>
    ['Llovizna', 'Lluvia', 'Lluvia fuerte', 'Diluvio'].includes(
      p.periodStatus,
    ),
  );
  const allSeco = periods.every((p) => p.periodStatus === 'Seco');

  let verdict: DayData['verdict'] = 'Seco';
  if (allSeco) {
    verdict = 'Seco';
  } else if (hasNieve && hasLluvia) {
    verdict = 'Mezcla';
  } else if (hasNieve) {
    verdict = 'Nieve';
  } else {
    const rainVerdicts = periods
      .filter((p) => p.periodStatus !== 'Seco')
      .map((p) => p.periodStatus);
    verdict = (rainVerdicts[0] ?? 'Seco') as DayData['verdict'];
  }

  // Compute day-level temp extremes from period values
  const tempMaxVal = periods.reduce(
    (max, p) => (p.temp !== null && (max === null || p.temp > max) ? p.temp : max),
    null as number | null,
  );
  const tempMinVal = periods.reduce(
    (min, p) =>
      p.feelsLike !== null && (min === null || p.feelsLike < min)
        ? p.feelsLike
        : min,
    null as number | null,
  );

  return {
    dayLabel: 'AYER',
    dayNum,
    dateStr,
    isToday: false,
    isYesterday: true,
    isHistorical: true,
    zoneAltitude,
    verdict,
    verdictBadgeStyle: getVerdictBadgeStyle(verdict),
    tempMax: tempMaxVal !== null ? Math.round(tempMaxVal) : 0,
    tempMin: tempMinVal !== null ? Math.round(tempMinVal) : 0,
    periods,
  };
}