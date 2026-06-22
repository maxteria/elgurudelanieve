import getSupabase from './client';
import { getCaviahueDayKey, toCaviahueFromLocal } from '../time/caviahue-time';
import { buildDaysData, ZONE_CONFIG } from '../pronostico';
import { getSevenDayForecast } from '../forecast-periods';
import type { NormalizedHourlyForecast } from '../weather/types';
import type { ForecastHourInsert, ForecastPeriodSummaryInsert } from './forecast-types';

/**
 * Save a forecast snapshot to Supabase:
 *   - 1 forecast_run row (one per build)
 *   - N forecast_hours rows (Nivel A — raw hourly data)
 *   - M forecast_period_summaries rows (Nivel B — derived AM/PM/Noche per zone)
 *
 * Fire-and-forget: this never throws. Failures log a warning and return silently.
 * If Supabase env vars are missing, returns immediately without error.
 */
export async function storeForecastSnapshot(
  hourly: NormalizedHourlyForecast[],
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const buildHash =
    import.meta.env?.VERCEL_GIT_COMMIT_SHA ??
    (typeof process !== 'undefined' ? process.env.VERCEL_GIT_COMMIT_SHA : null) ??
    null;

  // ── 1. Create forecast run ─────────────────────────────────────────────
  const { data: run, error: runErr } = await sb
    .from('forecast_runs')
    .insert({
      run_timestamp: new Date().toISOString(),
      run_date: getCaviahueDayKey(new Date().toISOString()),
      source: 'open-meteo',
      build_hash: buildHash,
    })
    .select('id')
    .single();

  if (runErr || !run) {
    console.warn('[ForecastStore] Failed to create forecast run:', runErr?.message);
    return;
  }
  const runId = run.id;

  // ── 2. Insert forecast_hours (Nivel A) ─────────────────────────────────
  // Use toCaviahueFromLocal for Open-Meteo timestamps that are already in
  // America/Argentina/Buenos_Aires local time without a TZ designator.
  const hourRows: ForecastHourInsert[] = hourly.map((h) => {
    const cav = toCaviahueFromLocal(h.time);
    return {
      forecast_run_id: runId,
      local_date: cav.localDayKey,
      hour: cav.localHour,
      temp: h.temp,
      feels_like: h.feelsLike,
      precipitation: h.precipitation,
      snowfall: h.snowfall,
      freezing_level: h.freezingLevel,
      wind: h.wind,
      wind_dir: h.windDir,
      wind_gusts: h.windGusts,
      humidity: h.humidity,
      cloud_cover: h.cloudCover,
      snow_depth: h.snowDepth,
      weather_code: h.weatherCode,
      precipitation_probability: h.precipitationProbability,
    };
  });

  if (hourRows.length > 0) {
    const { error: hoursErr } = await sb.from('forecast_hours').insert(hourRows);
    if (hoursErr) {
      console.warn('[ForecastStore] Failed to insert hours:', hoursErr.message);
    }
  }

  // ── 3. Build & insert forecast_period_summaries (Nivel B) ──────────────
  const dailySummaries = getSevenDayForecast(hourly);
  const summaryRows: ForecastPeriodSummaryInsert[] = [];

  for (const [zone, config] of Object.entries(ZONE_CONFIG)) {
    const days = buildDaysData(dailySummaries, hourly, config.altitude);
    for (const day of days) {
      for (const period of day.periods) {
        summaryRows.push({
          forecast_run_id: runId,
          local_date: day.dateStr,
          zone: zone as 'village' | 'mid' | 'top',
          period: period.label as 'AM' | 'PM' | 'Noche',
          snow_cm: period.snowCm,
          rain_mm: period.precip,
          wind_kmh: period.windSpeed,
          temp_max: period.temp,
          temp_min: period.feelsLike,
          cota_m: period.cota,
          humidity_pct: period.humidity,
          cloud_pct: period.cloud,
          period_status: period.periodStatus,
        });
      }
    }
  }

  if (summaryRows.length > 0) {
    const { error: summaryErr } = await sb
      .from('forecast_period_summaries')
      .insert(summaryRows);
    if (summaryErr) {
      console.warn('[ForecastStore] Failed to insert summaries:', summaryErr.message);
    }
  }

  console.info(
    `[ForecastStore] Saved run ${runId}: ${hourRows.length} hours, ${summaryRows.length} period summaries`,
  );
}
