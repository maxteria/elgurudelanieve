/**
 * Types for forecast history snapshots stored in Supabase.
 *
 * Two levels:
 *   A) forecast_hours       — raw hourly normalized forecast
 *   B) forecast_period_summaries — derived AM/PM/Noche per zone as shown on /pronostico
 *
 * Each is linked to a forecast_run (one per build).
 * Multiple runs per day are allowed.
 */

/** One build/run of the Guru forecast pipeline. */
export interface ForecastRun {
  id: number;
  created_at: string; // ISO timestamp
  run_timestamp: string; // ISO timestamp — when the forecast was generated
  run_date: string; // Caviahue local date (YYYY-MM-DD)
  source: string; // 'open-meteo'
  build_hash: string | null; // VERCEL_GIT_COMMIT_SHA if available
}

/** Raw hourly normalized forecast data (Nivel A). One row per hour. */
export interface ForecastHourRow {
  id: number;
  forecast_run_id: number;
  local_date: string; // Caviahue local date
  hour: number; // 0–23 Caviahue local
  temp: number | null;
  feels_like: number | null;
  precipitation: number | null; // mm
  snowfall: number | null; // cm
  freezing_level: number | null; // m
  wind: number | null; // km/h
  wind_dir: number | null; // degrees
  wind_gusts: number | null; // km/h
  humidity: number | null; // %
  cloud_cover: number | null; // %
  snow_depth: number | null; // cm
  weather_code: number | null;
  precipitation_probability: number | null; // %
}

/** Input shape for inserting a forecast hour (without id/forecast_run_id). */
export type ForecastHourInsert = Omit<
  ForecastHourRow,
  'id' | 'forecast_run_id'
> & { forecast_run_id: number };

/**
 * Derived snapshot of the extended forecast table (Nivel B).
 * One row per (run, local_date, zone, period).
 */
export interface ForecastPeriodSummaryRow {
  id: number;
  forecast_run_id: number;
  local_date: string; // Caviahue local date
  zone: 'village' | 'mid' | 'top';
  period: 'AM' | 'PM' | 'Noche';
  snow_cm: number | null;
  rain_mm: number | null;
  wind_kmh: number | null;
  temp_max: number | null;
  temp_min: number | null;
  cota_m: number | null;
  humidity_pct: number | null;
  cloud_pct: number | null;
  period_status: string | null; // 'Seco' | 'Llovizna' | 'Lluvia' | ...
}

/** Input shape for inserting a period summary (without id/forecast_run_id). */
export type ForecastPeriodSummaryInsert = Omit<
  ForecastPeriodSummaryRow,
  'id' | 'forecast_run_id'
> & { forecast_run_id: number };

/** Grouped result combining a run with its data. */
export interface HistoricalForecastResult {
  run: ForecastRun;
  hours: ForecastHourRow[];
  summaries: ForecastPeriodSummaryRow[];
}
