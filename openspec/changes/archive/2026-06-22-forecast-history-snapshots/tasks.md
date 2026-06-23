# Tasks: Forecast History Snapshots

## PR1 — Schema y tipos

### T1.1 Crear migración SQL
- Archivo: `supabase/migrations/20260622_forecast_snapshots.sql`
- Crear tabla `forecast_runs`:
  - `id BIGSERIAL PRIMARY KEY`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `run_timestamp TIMESTAMPTZ NOT NULL`
  - `run_date DATE NOT NULL` (fecha Caviahue local de la corrida)
  - `source TEXT NOT NULL DEFAULT 'open-meteo'`
  - `build_hash TEXT`
  - Sin UNIQUE constraint — múltiples corridas/día permitidas
- Crear tabla `forecast_hours`:
  - `id BIGSERIAL PRIMARY KEY`
  - `forecast_run_id BIGINT NOT NULL REFERENCES forecast_runs(id) ON DELETE CASCADE`
  - `local_date DATE NOT NULL`
  - `hour SMALLINT NOT NULL CHECK (hour >= 0 AND hour <= 23)`
  - `temp REAL`, `feels_like REAL`, `precipitation REAL`, `snowfall REAL`
  - `freezing_level REAL`, `wind REAL`, `wind_dir SMALLINT`, `wind_gusts REAL`
  - `humidity REAL`, `cloud_cover REAL`, `snow_depth REAL`
  - `weather_code SMALLINT`, `precipitation_probability SMALLINT`
- Crear tabla `forecast_period_summaries`:
  - `id BIGSERIAL PRIMARY KEY`
  - `forecast_run_id BIGINT NOT NULL REFERENCES forecast_runs(id) ON DELETE CASCADE`
  - `local_date DATE NOT NULL`
  - `zone TEXT NOT NULL CHECK (zone IN ('village', 'mid', 'top'))`
  - `period TEXT NOT NULL CHECK (period IN ('AM', 'PM', 'Noche'))`
  - `snow_cm REAL`, `rain_mm REAL`, `wind_kmh REAL`
  - `temp_max REAL`, `temp_min REAL`, `cota_m REAL`
  - `humidity_pct REAL`, `cloud_pct REAL`
  - `period_status TEXT` (valores: Seco, Llovizna, Lluvia, Lluvia fuerte, Diluvio, Nieve, Mezcla)
- Índices:
  - `forecast_runs`: `(run_date DESC)`
  - `forecast_hours`: `(forecast_run_id)`, `(local_date)`
  - `forecast_period_summaries`: `(forecast_run_id)`, `(local_date, zone)`

### T1.2 Tipos TypeScript
- Archivo: `src/lib/supabase/forecast-types.ts` (nuevo, no `types.ts`)
- `ForecastRun` interface
- `ForecastHourRow` / `ForecastHourInsert` interfaces
- `ForecastPeriodSummaryRow` / `ForecastPeriodSummaryInsert` interfaces

### T1.3 Validación de env vars
- En `src/lib/supabase/client.ts`:
  - `getSupabase()` retorna null si faltan vars ✅
  - `SUPABASE_SERVICE_KEY` no se expone al cliente (solo `import.meta.env` sin prefijo `PUBLIC_`) ✅

**Criterio de aceptación**: ✅ migración aplicable limpia, tipos compilan, env vars detectables sin crash.

---

## PR2 — Escritura de snapshots

### T2.1 Crear `storeForecastSnapshot()`
- Archivo: `src/lib/supabase/forecast-store.ts` (nuevo)
- Función: `async function storeForecastSnapshot(hourly: NormalizedHourlyForecast[]): Promise<void>`
- Pasos:
  1. `const sb = getSupabase()` — si null, return sin error
  2. `const cav = toCaviahue(new Date().toISOString())` — run_date en Caviahue
  3. `const buildHash = process.env.VERCEL_GIT_COMMIT_SHA ?? null`
  4. Insert `forecast_runs` con `run_date: cav.localDayKey`, `run_timestamp: new Date().toISOString()`
  5. Con el `run_id` retornado, construir array de `forecast_hours` rows:
     - `local_date = getCaviahueDayKey(h.time)`
     - `hour = toCaviahue(h.time).localHour`
     - Mapear 1:1 campos de `NormalizedHourlyForecast` → columnas
  6. Insert batch `forecast_hours`
  7. Construir array de `forecast_period_summaries` rows:
     - Agrupar horas por `(local_date, zone, period)` usando la lógica de `buildDaysData` en `pronostico.ts`
     - Calcular snow_cm, rain_mm, wind_kmh, temp_max, temp_min, cota_m, humidity_pct, cloud_pct, period_status
     - Esto requiere recorrer las 3 zonas (village/mid/top) aplicando zoneOffset
  8. Insert batch `forecast_period_summaries`
- Logging: `console.info('[ForecastStore] Saved run ${runId}: ${hourRows.length} hours, ${summaryRows.length} summaries')`
- Errores: catch individual por cada insert, nunca propagar excepción

### T2.2 Hook en `weather-source.ts`
- En `getWeatherData()`, dentro del bloque `source === 'open-meteo'`, al final antes del return:
  ```typescript
  storeForecastSnapshot(normalized.hourly).catch((err) =>
    console.warn('[ForecastStore] save failed (non-blocking):', err),
  );
  ```
- Importar `storeForecastSnapshot` desde `../supabase/forecast-store`
- No guardar en modo demo ni fallback
- No bloquear el build

### T2.3 Logging de resultado
- En `forecast-store.ts`: log success con cantidad de filas insertadas
- En `weather-source.ts`: log de "snapshot store initiated" o similar
- Logs claros con prefijo `[ForecastStore]`

**Criterio de aceptación**: un build con source=open-meteo persiste datos en Supabase. Build en modo demo no guarda. Supabase caído no rompe build.

---

## PR3 — Lectura histórica y mezcla

### T3.1 Crear `getHistoricalYesterday()`
- Archivo: `src/lib/supabase/forecast-store.ts`
- Función: `async function getHistoricalYesterday(): Promise<Record<string, ForecastPeriodSummaryRow[]> | null>`
- Query directa a `forecast_period_summaries` filtrado por `local_date = yesterdayKey`
- Delega en `pickBestHistoricalRun()` para encontrar el run más reciente con datos completos
- Si Supabase falla / tabla inexistente / sin datos → retorna null (warning, no crash)

✅ Desviación del plan original: en vez de `getHistoricalPeriodSummaries` + `getHistoricalHours` separados, implementamos `getHistoricalYesterday` que hace todo en un solo query + filtro de completitud. No reconstruimos desde horas (Nivel A) sino desde period summaries (Nivel B).

### T3.2 (no implementada) — `getHistoricalHours()` no es necesaria
La reconstrucción de AYER se hace desde `forecast_period_summaries` (Nivel B), no desde `forecast_hours` (Nivel A). Esto es correcto porque el AYER histórico debe reflejar el pronóstico guardado, no los datos horarios crudos.

### T3.3 Integrar en `pronostico.astro` (no en `getSevenDayForecast`)
- `getSevenDayForecast` se mantiene **sync** — no se modifica
- Merge en `pronostico.astro` post-`buildDaysData`:
  1. `await getHistoricalYesterday()`
  2. Si retorna datos → `unshift(buildHistoricalDayData(zoneRows, altitude))` a cada zona
  3. La mezcla ocurre **antes** de `getGuruCopy`, así que el Gurú ve el AYER histórico

✅ Desviación: `getSevenDayForecast` no se hizo async. El merge se hace en `.astro` frontmatter.

### T3.4 Adaptar `buildDaysData()` para `isHistorical`
- `DayData` type: agregado `isHistorical: boolean` ✅
- `buildDaysData()` asigna `isHistorical: false` a días regulares ✅
- No se agregó a `DailySummary` porque no se necesita (el merge es post-buildDaysData directo a DayData)

### T3.5 Manejo de datos insuficientes
- `isHistoricalRunComplete()` verifica 3 zonas × 3 períodos ✅
- `pickBestHistoricalRun()` agrupa por `forecast_run_id` y retorna el más reciente completo, o null ✅
- Si Supabase no responde → null, log warning ✅
- `— null` fixeado en PR4 ✅

**Criterio de aceptación**: ✅ AYER aparece en la tabla cuando hay histórico. Sin histórico, no aparece. Async no rompe build estático.

---

## PR4 — UI mínima

### T4.1 Indicador visual para datos históricos
- Archivo: `src/pages/pronostico.astro`
- Cuando `day.isHistorical && !day.isToday`: muestra "Pronóstico guardado" en amber-400/35 debajo del badge de veredicto ✅
- El día histórico NO recibe `bg-hielo/[0.08]` de HOY (el estilo isToday no aplica) ✅

✅ Desviación: en vez de `opacity-60`/`border-dashed`, usamos un indicador textual explícito "Pronóstico guardado" que es semánticamente más claro.

### T4.2 Tooltip / label de origen
- Tooltip en el label "Pronóstico guardado": `"Lo que el pronóstico había previsto para este día, no un dato real"` ✅
- Nunca dice "observado", "dato real" ni "parte oficial" ✅

### T4.3 Mensaje cuando no hay histórico
- Si no hay histórico → el merge no se ejecuta, la tabla arranca directo en HOY ✅
- No se agrega mensaje de "No hay datos históricos" ✅

**Criterio de aceptación**: ✅ días históricos muestran "Pronóstico guardado". Tooltip explica origen. Sin AYER cuando no hay datos es silencioso.

---

## PR5 — Verify / archive

### T5.1 Tests unitarios
- Tests agregados en `src/lib/__tests__/pronostico.test.ts` (no archivo separado)
- Tests implementados:
  - `isHistoricalRunComplete` — 3z × 3p completo, 2 zonas, missing period, empty, multiple runs ✅
  - `pickBestHistoricalRun` — null si ninguno completo, más reciente completo, empty ✅
  - `buildHistoricalDayData` — isHistorical=true, mapeo de campos, null safety, veredicto Nieve/Seco, períodos faltantes ✅

✅ Desviación: no se creó `forecast-store.test.ts` porque las funciones de negocio (`isHistoricalRunComplete`, `pickBestHistoricalRun`, `buildHistoricalDayData`) viven en `pronostico.ts`. Los tests de base de datos requieren Supabase real o mock complejo que no vale la pena.

### T5.2 Tests de integración (cubiertos por T5.1 + build verify)

### T5.3 Build verify
- `npm run test` — 171/171 passed ✅
- `npm run build` — 5 páginas, Complete! ✅
- Warnings controlados: `[ForecastStore]` y `[Supabase]` sin romper build ✅

### T5.4 QA automatizado por verificación de código
- `/pronostico` sin Supabase → build OK, `getHistoricalYesterday` retorna null, tabla sin AYER ✅
- `— null` en viento — fixeado en PR4: windSpeed null → `—` ✅
- Todas las celdas usan `p.valor !== null ? valor : '—'` ✅
- UI en español — "Pronóstico guardado", tooltip en español ✅

### T5.5 Archive (este paso)
- Tasks actualizadas ✅
- Pendiente: correr `sdd-verify`, archivar cambio

**Criterio de aceptación**: ✅ tests verdes, build OK, Supabase caído no rompe nada.

---

## Resumen de archivos

| Archivo | PR | Acción |
|---------|----|--------|
| `supabase/migrations/20260622_forecast_snapshots.sql` | PR1 | Crear |
| `src/lib/supabase/types.ts` | PR1 | Crear |
| `src/lib/supabase/client.ts` | PR1 | Verificar env vars |
| `src/lib/supabase/forecast-store.ts` | PR2, PR3 | Crear (~150 líneas) |
| `src/lib/weather/weather-source.ts` | PR2 | Agregar hook |
| `src/lib/weather/types.ts` | PR3 | Agregar isHistorical, sourceRunDate a DailySummary |
| `src/lib/forecast-periods.ts` | PR3 | Modificar getSevenDayForecast → async + historical lookup |
| `src/lib/pronostico.ts` | PR3 | DayData.isHistorical, sourceRunDate |
| `src/pages/pronostico.astro` | PR4 | Indicador visual + tooltip |
| `src/lib/__tests__/supabase/forecast-store.test.ts` | PR5 | Crear |
| `src/lib/__tests__/forecast-periods.test.ts` (o existente) | PR5 | Agregar tests de mezcla |

## Review Workload Forecast
- PR1: ~80 líneas (SQL + types)
- PR2: ~150 líneas (store + hook)
- PR3: ~120 líneas (lectura + mezcla)
- PR4: ~40 líneas (solo clases y tooltip)
- PR5: ~200 líneas (tests)
- Total estimado: ~590 líneas
