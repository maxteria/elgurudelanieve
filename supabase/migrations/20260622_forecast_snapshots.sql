-- Migration: Create forecast history snapshot tables
-- Tables for persisting forecast data from each Guru build.
-- Two levels: hourly normalized data + derived period summaries per zone.
-- Multiple runs per day are allowed (no UNIQUE constraint on run_date).

-- ── forecast_runs ───────────────────────────────────────────────────────────
-- One row per build/run of the Guru forecast pipeline.

CREATE TABLE IF NOT EXISTS forecast_runs (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_timestamp TIMESTAMPTZ NOT NULL,        -- when the forecast was generated
  run_date      DATE NOT NULL,               -- Caviahue local date of the run
  source        TEXT NOT NULL DEFAULT 'open-meteo',
  build_hash    TEXT                          -- VERCEL_GIT_COMMIT_SHA if available
);

CREATE INDEX IF NOT EXISTS idx_forecast_runs_date
  ON forecast_runs (run_date DESC);


-- ── forecast_hours ──────────────────────────────────────────────────────────
-- Level A: raw hourly normalized forecast data for fine-grained analysis.
-- Each row corresponds to one hour of the Open-Meteo normalized response,
-- using Caviahue local date/hour for consistent timezone handling.
-- Multiple runs may exist for the same local_date.

CREATE TABLE IF NOT EXISTS forecast_hours (
  id                        BIGSERIAL PRIMARY KEY,
  forecast_run_id           BIGINT NOT NULL REFERENCES forecast_runs(id) ON DELETE CASCADE,
  local_date                DATE NOT NULL,
  hour                      SMALLINT NOT NULL CHECK (hour >= 0 AND hour <= 23),
  temp                      REAL,
  feels_like                REAL,
  precipitation             REAL,
  snowfall                  REAL,
  freezing_level            REAL,
  wind                      REAL,
  wind_dir                  SMALLINT,
  wind_gusts                REAL,
  humidity                  REAL,
  cloud_cover               REAL,
  snow_depth                REAL,
  weather_code              SMALLINT,
  precipitation_probability SMALLINT
);

CREATE INDEX IF NOT EXISTS idx_forecast_hours_run
  ON forecast_hours (forecast_run_id);

CREATE INDEX IF NOT EXISTS idx_forecast_hours_date
  ON forecast_hours (local_date);


-- ── forecast_period_summaries ────────────────────────────────────────────────
-- Level B: derived snapshot of the extended forecast table as shown on
-- /pronostico. One row per (run, local_date, zone, period).
-- Enables direct reconstruction of yesterday's table without re-processing
-- raw hours.

CREATE TABLE IF NOT EXISTS forecast_period_summaries (
  id              BIGSERIAL PRIMARY KEY,
  forecast_run_id BIGINT NOT NULL REFERENCES forecast_runs(id) ON DELETE CASCADE,
  local_date      DATE NOT NULL,
  zone            TEXT NOT NULL CHECK (zone IN ('village', 'mid', 'top')),
  period          TEXT NOT NULL CHECK (period IN ('AM', 'PM', 'Noche')),
  snow_cm         REAL,
  rain_mm         REAL,
  wind_kmh        REAL,
  temp_max        REAL,
  temp_min        REAL,
  cota_m          REAL,
  humidity_pct    REAL,
  cloud_pct       REAL,
  period_status   TEXT CHECK (period_status IN (
    'Seco', 'Llovizna', 'Lluvia', 'Lluvia fuerte', 'Diluvio', 'Nieve', 'Mezcla'
  ))
);

CREATE INDEX IF NOT EXISTS idx_fps_run
  ON forecast_period_summaries (forecast_run_id);

CREATE INDEX IF NOT EXISTS idx_fps_date_zone
  ON forecast_period_summaries (local_date, zone);
