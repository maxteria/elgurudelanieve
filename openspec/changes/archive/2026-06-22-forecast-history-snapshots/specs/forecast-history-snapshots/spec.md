# Spec: Forecast History Snapshots

## Purpose
Persistir en Supabase todos los datos que alimentan y se muestran en la tabla de `/pronostico` durante cada corrida del Gurú, en dos niveles: (A) datos horarios normalizados para análisis fino, y (B) snapshot de la tabla derivada por zona y período para saber exactamente qué se mostró.

Esto permite reconstruir AYER, comparar previsiones entre corridas, y eventualmente alimentar `/historico` con datos reales del Gurú.

No confundir con observación real. Es histórico de pronóstico: "qué decía el modelo/Gurú en esa corrida".

---

## 1. Qué se guarda

Se guardan DOS niveles:

### Nivel A: `forecast_hours` — datos horarios normalizados
Cada hora del forecast de Open-Meteo, con todos los campos que llegan de la API. Sirve para:
- Reconstrucción futura con distintos criterios de agregación
- Análisis fino (por hora, no solo por período)
- Depuración y auditoría

### Nivel B: `forecast_period_summaries` — snapshot de tabla derivada
Los datos tal como se muestran en la tabla de `/pronostico`, desglosados por (zona × período AM/PM/Noche). Sirve para:
- Saber exactamente qué se mostró en cada corrida
- Reconstruir AYER sin reprocesar horas
- Comparar corridas a nivel de celda visible

NO se guarda:
- HTML renderizado
- Confidence score ni reasons (son del motor de predicción)
- Guru copy (texto narrativo del LLM)
- Observaciones reales de AIC (tabla separada `aic_readings`)
- Verdicts ni badges (se derivan de los datos)

---

## 2. Cuándo se guarda

Al final de cada build exitoso, dentro de `getWeatherData()` en `weather-source.ts`, cuando la fuente es `open-meteo`.

- Operación fire-and-forget: `.catch()` silencioso, nunca bloquea el build
- No se guarda en modo demo ni mock-fallback
- Cada build crea EXACTAMENTE UNA fila en `forecast_runs` y N filas en las tablas de datos
- Si Supabase no está disponible (variables de entorno faltantes), skip — sin error

### Trigger
```typescript
if (source === 'open-meteo') {
  storeForecastSnapshot(normalized.hourly).catch((err) =>
    console.warn('[ForecastStore] save failed (non-blocking):', err),
  );
}
```

La función `storeForecastSnapshot` se encarga de:
1. Insertar `forecast_runs` con timestamp y build_hash
2. Insertar todas las horas en `forecast_hours` (batch)
3. Construir los períodos (AM/PM/Noche) y zonas, e insertar en `forecast_period_summaries` (batch)

### Frecuencia real
- Sitio estático: un build por deploy (manual o Vercel auto-deploy)
- El build_hash se obtiene de `process.env.VERCEL_GIT_COMMIT_SHA` o similar
- Se puede tener múltiples runs en el mismo día calendario si hay varios deploys

---

## 3. Cómo se consulta

### API de consulta principal

```typescript
// Nivel B — para reconstrucción directa de tabla
function getHistoricalPeriodSummaries(
  localDate: string,
  zone?: ZoneId,
): Promise<ForecastPeriodSummary[]>

// Nivel A — para análisis fino
function getHistoricalHours(
  localDate: string,
): Promise<NormalizedHourlyForecast[]>

// Obtener el run más reciente (para metadatos)
function getLatestRun(): Promise<ForecastRun | null>
```

### Reglas de negocio para consulta
- `getHistoricalPeriodSummaries('2026-06-21')` busca en `forecast_period_summaries` todas las filas con esa `local_date`
- Toma el `forecast_run_id` más reciente (el último build que incluyó esa fecha)
- Si hay múltiples runs, se prioriza el que tiene más horas completas (>20 horas en `forecast_hours`)
- El JOIN con `forecast_runs` solo incluye runs cuya `run_timestamp` ≤ la `local_date` + 24h (no se pueden usar runs que predicen un día después de que ya pasó, o mejor dicho: se puede pero la data es menos relevante)

### Query SQL ejemplo (Nivel B para AYER)
```sql
SELECT ps.*
FROM forecast_period_summaries ps
JOIN forecast_runs r ON r.id = ps.forecast_run_id
WHERE ps.local_date = '2026-06-21'
  AND r.run_timestamp <= '2026-06-22T00:00:00-03:00'
ORDER BY r.id DESC
LIMIT 3;  -- village, mid, top
```

---

## 4. Cómo se mezcla histórico + forecast actual en `/pronostico`

### En `getSevenDayForecast()`
1. Agrupar forecast actual por Caviahue dayKey (código existente)
2. Determinar yesterdayKey y todayKey
3. Si yesterdayKey **no** está en el grouped actual:
   a. `getHistoricalPeriodSummaries(yesterdayKey)` — consulta Nivel B
   b. Si hay datos: crear un `DailySummary` con `isHistorical = true` y una bandera `dataSource: 'historical'`
   c. Si no hay datos: no incluir AYER
4. Si yesterdayKey **sí** está en el grouped actual: usarlo directamente

### En `buildDaysData()`
- `DayData` recibe nuevo flag: `isHistorical: boolean`
- `sourceLabel?: 'current' | 'historical'` para identificar origen
- Tabla HTML: cuando `isHistorical`, las celdas usan clase `opacity-60 border-dashed` con un tooltip o label "Pronóstico guardado · {fecha del run}"

### Comportamiento si no hay histórico
- No mostrar columna AYER
- No crash, no warning visible al usuario
- Mensaje en consola: `[ForecastStore] No historical data for {yesterdayKey}`

---

## 5. Qué mostrar si falta histórico

| Situación | Comportamiento |
|-----------|---------------|
| `forecast_period_summaries` tiene datos para AYER | Mostrar AYER con indicador visual "histórico" |
| `forecast_hours` tiene datos pero es < 8 horas | No se considera suficiente — omitir AYER |
| No hay datos en ninguna tabla | No mostrar AYER. Log interno. |
| Supabase no configurado | No mostrar AYER. Sin errores. |
| Supabase no responde | No mostrar AYER. Log warning. |

### Distinción visual
- Dato histórico: `opacity-60` + `border-dashed` en el borde inferior de la celda
- Tooltip: "Pronóstico guardado — corrida del {run_date}"
- Dato actual: normal (sin modificaciones)

---

## 6. Cómo evitar duplicados

### En escritura
- **No hay UNIQUE constraint en `forecast_runs`** — se permiten múltiples corridas por día
- El identificador es `id` (serial), no hay clave natural
- Si se necesita evitar inserts accidentales duplicados exactos, se puede comparar `run_timestamp` con el último run guardado, pero no es obligatorio

### En consulta
- `getHistoricalPeriodSummaries` retorna TODAS las filas; el caller decide qué run usar
- Por defecto: `ORDER BY forecast_run_id DESC LIMIT 1` por zona
- Para reconstruir AYER: solo las filas con `local_date = yesterdayKey`
- Si hay múltiples runs para la misma fecha, se toma el más reciente con datos completos

### Migración
- No hay backfill. Los datos empiezan a acumularse desde el deploy.
- Días anteriores al deploy no tendrán histórico.

---

## 7. Tests requeridos

### Unitarios — `forecast-store.ts`

| Test | Descripción |
|------|-------------|
| `storeForecastSnapshot` guarda run + horas + summaries | Mock Supabase, verificar 3 inserts en batch |
| `storeForecastSnapshot` modo demo → no guarda | Mock source=demo → 0 inserts |
| `storeForecastSnapshot` sin Supabase → silencioso | Sin variables de entorno → no lanza error |
| `getHistoricalPeriodSummaries` con datos | Retorna array de summaries para la fecha |
| `getHistoricalPeriodSummaries` sin datos | Retorna `[]` |
| `getHistoricalPeriodSummaries` múltiples runs | Retorna los del run más reciente |
| `getHistoricalHours` compatibilidad | Retorna `NormalizedHourlyForecast[]` |

### Integración — mezcla en forecast-periods

| Test | Descripción |
|------|-------------|
| `getSevenDayForecast` con AYER histórico | Mock getHistoricalPeriodSummaries → AYER incluido con isHistorical=true |
| `getSevenDayForecast` sin histórico | Mock retorna `[]` → AYER no se incluye |
| `buildDaysData` recibe y propaga `isHistorical` | Verificar DayData.isHistorical en cada día |
| Build estático con datos mock | Build de Astro no se rompe con datos históricos mock |

### Visuales (manual)

| Test | Descripción |
|------|-------------|
| AYER con datos históricos | Tabla muestra AYER con opacidad reducida |
| AYER sin datos | Tabla arranca en HOY |
| Tooltip en día histórico | Hover/texto visible indica origen |
| Sin Supabase | Build no se rompe, tabla normal sin AYER |

---

## Constraints
- No usar LLM/AI para generar datos históricos
- No inventar forecast para días no guardados
- No bloquear build por errores de Supabase
- No guardar datos en modo demo ni fallback
- No modificar Open-Meteo fetch, normalize, ni pipeline de predicción
- No modificar confidence, governance ni motor de snow-engine
- `forecast_period_summaries.period_status` usa los mismos valores que `PeriodData.periodStatus` en `pronostico.ts`
- Los datos siempre en fecha local Caviahue, nunca UTC ni server-time
- Permitir ≥2 corridas en el mismo día sin conflictos
