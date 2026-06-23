# Design: Forecast History Snapshots

## File structure

### New file
- `src/lib/supabase/forecast-store.ts` — store + query functions (~120 lines)

### Modified files
- `src/lib/weather/weather-source.ts` — trigger store al final de getWeatherData()
- `src/lib/forecast-periods.ts` — consultar histórico si AYER falta en forecast actual
- `src/lib/pronostico.ts` — DayData.isHistorical + DayData.sourceLabel
- `src/components/...` (por definir) — opacidad/borde para datos históricos

## Schema SQL

### `forecast_runs`
```sql
CREATE TABLE forecast_runs (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_timestamp TIMESTAMPTZ NOT NULL,      -- cuándo se generó el forecast
  run_date      DATE NOT NULL,             -- fecha Caviahue local de la corrida
  source        TEXT NOT NULL DEFAULT 'open-meteo',
  build_hash    TEXT                       -- VERCEL_GIT_COMMIT_SHA si existe
);
CREATE INDEX idx_forecast_runs_date ON forecast_runs (run_date DESC);
```

### `forecast_hours`
```sql
CREATE TABLE forecast_hours (
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
CREATE INDEX idx_forecast_hours_run ON forecast_hours (forecast_run_id);
CREATE INDEX idx_forecast_hours_date ON forecast_hours (local_date);
```

### `forecast_period_summaries`
```sql
CREATE TABLE forecast_period_summaries (
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
  period_status   TEXT -- 'Seco' | 'Llovizna' | 'Lluvia' | 'Nieve' | ...
);
CREATE INDEX idx_fps_run ON forecast_period_summaries (forecast_run_id);
CREATE INDEX idx_fps_date ON forecast_period_summaries (local_date, zone);
```

## Flow

```
Build inicia
  → getWeatherData()
    → fetchOpenMeteo() → hourly[]
    → normalizeOpenMeteoResponse() → normalized
    → (si source === 'open-meteo')
        → storeForecastSnapshot(normalized.hourly)
          1. Calcular run_date y run_timestamp con getCaviahueDayKey() / toCaviahue()
          2. INSERT INTO forecast_runs (...) VALUES (...)
          3. Construir horas: por cada h → forecast_hours row
          4. Construir períodos: agrupar horas por (local_date, zone, period)
             → usar lógica de buildDaysData para derivar valores por período
          5. INSERT INTO forecast_hours (...) batch
          6. INSERT INTO forecast_period_summaries (...) batch
  → getSevenDayForecast(hourly)
    → agrupar por Caviahue dayKey
    → si yesterdayKey falta → getHistoricalPeriodSummaries(yesterdayKey)
    → mezclar con isHistorical flag
  → render
```

## storeForecastSnapshot — pseudocódigo

```typescript
export async function storeForecastSnapshot(
  hourly: NormalizedHourlyForecast[],
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const cav = toCaviahue(new Date().toISOString());
  const buildHash = process.env.VERCEL_GIT_COMMIT_SHA ?? null;

  // 1. Insert run
  const { data: run, error: runErr } = await sb
    .from('forecast_runs')
    .insert({
      run_timestamp: new Date().toISOString(),
      run_date: cav.localDayKey,
      source: 'open-meteo',
      build_hash: buildHash,
    })
    .select('id')
    .single();

  if (runErr || !run) { console.warn('[ForecastStore] run insert failed:', runErr?.message); return; }
  const runId = run.id;

  // 2. Insert hours (batch)
  const hourRows = hourly.map((h) => ({
    forecast_run_id: runId,
    local_date: getCaviahueDayKey(h.time),
    hour: toCaviahue(h.time).localHour,
    temp: h.temp, feels_like: h.feelsLike,
    precipitation: h.precipitation, snowfall: h.snowfall,
    freezing_level: h.freezingLevel, wind: h.wind,
    wind_dir: h.windDir, wind_gusts: h.windGusts,
    humidity: h.humidity, cloud_cover: h.cloudCover,
    snow_depth: h.snowDepth, weather_code: h.weatherCode,
    precipitation_probability: h.precipitationProbability,
  }));

  const { error: hoursErr } = await sb.from('forecast_hours').insert(hourRows);
  if (hoursErr) console.warn('[ForecastStore] hours insert failed:', hoursErr.message);

  // 3. Build and insert period summaries (batch)
  // Agrupar horas por (local_date, approximate hour-slot)
  // Usar las mismas reglas que buildDaysData para calcular snow_cm, rain_mm, etc.
  // ... (lógica existente de pronostico.ts para derivar períodos)
}
```

## Integración con visual
- `DayData` extiende: `isHistorical: boolean` + `sourceRunDate?: string`
- En `pronostico.astro`, cuando `isHistorical`: clase `opacity-60 border-dashed border-white/[0.03]` + atributo `title="Pronóstico guardado — ${sourceRunDate}"`
- `isToday` / `isYesterday` mantienen colores actuales; histórico es independiente

## Edge cases
- **Múltiples builds el mismo día**: múltiples `forecast_runs`, se consulta el más reciente
- **Build sin Open-Meteo (fallback)**: no se guarda nada
- **Supabase caído**: warning en consola, build sigue, /pronostico sin AYER
- **Datos insuficientes**: < 8 horas para una fecha → omitir AYER
- **Primer build post-deploy**: sin datos históricos → tabla arranca en HOY
