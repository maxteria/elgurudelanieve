# Proposal: Forecast History Snapshots

## Intent
Registrar en Supabase la totalidad de los datos que alimentan y se muestran en la tabla de `/pronostico` durante cada corrida del Gurú, para tener un histórico consultable del pronóstico que permite:

1. Reconstruir AYER aunque la API actual ya no lo traiga.
2. Consultar histórico de pronóstico por fecha.
3. Comparar cómo cambiaron las previsiones entre corridas.
4. Tener datos por las 3 cotas (pueblo, centro/base, cumbre/sectores altos).
5. Eventualmente alimentar `/historico` con datos reales del Gurú.

Esto NO es observación real. Es histórico de pronóstico: "qué decía el modelo/Gurú en esa corrida".

## Alcance

### Incluido
- Guardar datos horarios normalizados (`forecast_hours`)
- Guardar snapshot de la tabla derivada para saber exactamente qué se mostró (`forecast_period_summaries`)
- 3 tablas: `forecast_runs`, `forecast_hours`, `forecast_period_summaries`
- Persistencia automática al final de cada build exitoso
- Consulta para reconstruir AYER en `/pronostico`
- Múltiples corridas por día permitidas
- Distinción visual entre dato "pronóstico guardado" vs "pronóstico actual"
- Si no hay histórico, no mostrar AYER

### No incluido
- No es observación real (AIC ya existe como tabla separada)
- No es parte oficial ni reemplaza validación de terreno
- No tocar predicción, governance ni LLM
- No backfill automático de días anteriores al deploy

## Tablas

### `forecast_runs`
Una fila por corrida del Gurú.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `bigint PK` | Auto |
| `created_at` | `timestamptz` | Cuándo se guardó en BD |
| `run_date` | `date` | Fecha local Caviahue de la corrida |
| `run_timestamp` | `timestamptz` | Timestamp ISO de cuando se ejecutó la corrida |
| `source` | `text` | `'open-meteo'` |
| `build_hash` | `text nullable` | Commit hash del build (si está disponible) |

Sin UNIQUE constraint por `(run_date, source)` — se permiten múltiples corridas por día.

### `forecast_hours` (nivel A)
Datos horarios normalizados para análisis fino y reconstrucción futura. Una fila por hora.

| Columna | Tipo |
|---------|------|
| `id` | `bigint PK` |
| `forecast_run_id` | `bigint FK → forecast_runs.id` |
| `local_date` | `date` (Caviahue) |
| `hour` | `int` (0–23, Caviahue local) |
| `temp` | `float` |
| `feels_like` | `float` |
| `precipitation` | `float` mm |
| `snowfall` | `float` cm |
| `freezing_level` | `float` m |
| `wind` | `float` km/h |
| `wind_dir` | `int` grados |
| `wind_gusts` | `float` km/h |
| `humidity` | `float` % |
| `cloud_cover` | `float` % |
| `snow_depth` | `float` cm |
| `weather_code` | `int` |
| `precipitation_probability` | `int` % |

### `forecast_period_summaries` (nivel B)
Snapshot de lo que se mostró en la tabla de `/pronostico`. Una fila por (run, fecha, zona, período AM/PM/Noche).

| Columna | Tipo |
|---------|------|
| `id` | `bigint PK` |
| `forecast_run_id` | `bigint FK → forecast_runs.id` |
| `local_date` | `date` (Caviahue) |
| `zone` | `text` (`village` \| `mid` \| `top`) |
| `period` | `text` (`AM` \| `PM` \| `Noche`) |
| `snow_cm` | `float nullable` |
| `rain_mm` | `float nullable` |
| `wind_kmh` | `float nullable` |
| `temp_max` | `float nullable` |
| `temp_min` | `float nullable` |
| `cota_m` | `float nullable` |
| `humidity_pct` | `float nullable` |
| `cloud_pct` | `float nullable` |
| `period_status` | `text` (`Seco` \| `Llovizna` \| `Lluvia` \| `Nieve` \| ...) |

## Casos de uso futuros
1. **AYER en /pronostico**: si el forecast actual no trae el día anterior, consultar `forecast_period_summaries` o `forecast_hours` del run más reciente que tenga esa fecha.
2. **Comparación entre corridas**: dos `forecast_runs` con distintas `run_date` → ver cómo cambió la previsión para una misma fecha objetivo.
3. **/historico**: mostrar datos de pronóstico guardados para fechas pasadas, distinguiendo visualmente de observación real.
