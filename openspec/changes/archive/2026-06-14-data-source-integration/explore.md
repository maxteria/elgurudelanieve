## Exploration: Data Source Integration

### Current State

El Gurú de la Nieve es un sitio Astro v6 SSG con build-time fetching de datos meteorológicos. Actualmente tiene dos fuentes de datos:

1. **Open-Meteo API** (free, no key): Pronóstico a 16 días con datos horarios (temp, precipitación, snowfall, freezing level, viento, humedad, nubosidad, snow depth, weather code, probabilidad de precipitación). **No usa `current_weather=true`**, no usa el endpoint de daily API.

2. **WeatherAPI** (requiere API key): Current conditions para el NowCard (temp, feelsLike, condition, icon, humidity, wind, cloudCover). Problema: datos cuestionables para zonas poco pobladas como Caviahue, y requiere API key que puede faltar.

3. **SMN (Servicio Meteorológico Nacional)**: Se importa en `weather-source.ts` pero el archivo `smn.ts` no existe — es una importación fantasma que falla silenciosamente.

4. **Fallback texts**: Cuando no hay Gemini, se usan respuestas pre-escritas. No hay cruce con mediciones reales.

El build es SSG puro (sin ISR), se ejecuta completo en cada deploy. No hay deploys programados — solo manuales.

### AIC Scraping Analysis

**What data is available:**
La página de AIC para la estación Caviahue (ASP.NET WebForms) expone datos DIARIOS (no horarios) en el primer tab ("Mediciones"):

| Variable | Unidad | Ejemplo real (14/06/2026) |
|----------|--------|--------------------------|
| Dirección Media Viento | grados | 135.3 |
| Equivalente Agua Nieve | mm | 0 |
| Humedad Relativa Media Diaria | % | 97.01 |
| Precipitación Diaria | mm | 0 |
| Presión Atmosférica Media Diaria | mB/hPa | 1020.43 |
| Temperatura Mínima Diaria | °C | -2.06 |
| Temperatura Máxima Diaria | °C | 5.73 |
| Velocidad Media Diaria Viento | m/seg | 0.62 |
| Velocidad Máxima Diaria Viento | m/seg | 5.96 |

**Nota importante del sitio AIC:** "Los valores medios se almacenan al fin del período. En el caso de medios diarios, los valores indicados corresponden al promedio del día anterior." — Es decir, los datos son del **día anterior** (yesterday's data).

**How to access it:**
- El tab "Mediciones" ya viene renderizado en el HTML inicial como una tabla `<table class="table">` dentro de un `<tbody id="body_TabMediciones_TabMed0_grilla">`.
- **No requiere POST** — los datos del último día están en el HTML directamente.
- Los charts históricos (otros tabs) SÍ requieren ASP.NET WebForms postback (`__doPostBack`) con `__VIEWSTATE`, `__EVENTTARGET`, etc.
- Coordenadas de la estación: -37.860000, -71.080818 (ver mapa embebido con Google Maps API key).

**Fragility assessment:**
- **Scraping del tab actual**: BAJA fragilidad. Es una tabla HTML simple con estructura muy estable (ASP.NET WebForms no cambia su markup frecuentemente). El selector es predecible: `#body_TabMediciones_TabMed0_grilla tr`.
- **Scraping histórico (charts)**: ALTA fragilidad. Los charts requieren manejar __VIEWSTATE, cookies de sesión, y los parámetros de postback. La URL de los charts (`/sitio/ChartImg.axd?i=...`) tiene hashes que pueden cambiar.
- **Dependency**: El sitio AIC puede caerse, cambiar de dominio, o migrar a otra tecnología. Es un sitio gubernamental argentino, sujeto a cambios impredecibles.
- **Rate limiting**: Desconocido, pero siendo un sitio ASP.NET sin API pública, recomendable 1 request cada 6-12 horas máximo.

**Recommendation:**
✅ Hacer scraping del tab "Mediciones" en el HTML inicial para obtener el dato diario de ayer. Es simple, estable y de bajo riesgo.
❌ NO hacer scraping de los charts históricos — demasiado frágil para el valor que aporta.
⏸ Evaluar si la AIC tiene o tendrá una API REST en el futuro (no la tiene hoy).

### Open-Meteo Current Weather Analysis

**Variables disponibles en `current_weather=true`:**

```json
{
  "current_weather": {
    "time": "2026-06-14T16:15",
    "interval": 900,
    "temperature": 5.0,
    "windspeed": 2.0,
    "winddirection": 275,
    "is_day": 1,
    "weathercode": 0
  }
}
```

**Comparación vs WeatherAPI:**

| Variable | Open-Meteo current_weather | WeatherAPI |
|----------|---------------------------|------------|
| Temperature | ✅ 5.0°C | ✅ Sí |
| Wind speed | ✅ 2.0 km/h | ✅ Sí |
| Wind direction | ✅ 275° | ❌ No |
| Weather code (WMO) | ✅ 0 (despejado) | ✅ Código propio |
| is_day | ✅ | ❌ No |
| Feels like | ❌ No | ✅ Sí |
| Humidity | ❌ No | ✅ Sí |
| Cloud cover | ❌ No | ✅ Sí |
| Condition text | ❌ No | ✅ "Despejado" |
| Icon URL | ❌ No | ✅ Sí |
| Updated at | ✅ Timestamp ISO | ✅ Timestamp |
| Cost | ✅ Gratis, sin key | ❌ Requiere key |
| Free tier | ✅ Ilimitado | ❌ 1M calls/mes gratis |

**Análisis:**
- Open-Meteo current_weather NO puede reemplazar completamente a WeatherAPI para el NowCard actual porque le faltan: feels_like, humidity, cloud cover, condition text e icon.
- Sin embargo, PARA CAVIAHUE (zona poco poblada), los datos de WeatherAPI son cuestionables, mientras que Open-Meteo current_weather es más confiable (usa modelos de asimilación de datos).
- El weather code (WMO) de Open-Meteo es un estándar internacional, más útil que el código propietario de WeatherAPI.

**Recommendation:**
✅ Agregar `current_weather=true` como fuente de datos ACTUAL — usarla como complemento a WeatherAPI.
✅ Mostrar "Open-Meteo" como source cuando WeatherAPI no está disponible o falla.
✅ El NowCard puede mostrar datos combinados: temperatura y viento de Open-Meteo, feels_like/humidity de WeatherAPI cuando está disponible.
✅ El weather code WMO es útil para el Gurú (el prompt de Gemini ya incluye códigos WMO).

### GitHub Actions + Rebuild Strategy

**Vercel Deploy Hooks approach:**
1. Vercel permite crear Deploy Hooks: URLs HTTP POST que disparan un nuevo build + deploy.
2. Desde GitHub Actions se puede hacer `curl -X POST https://api.vercel.com/v1/integrations/deploy/prj_xxx/yyyyy`
3. El rebuild es completo (SSG), no incremental. Con Astro v6 + Tailwind, el build actual es rápido (~30-60s).

**Schedule recommendation:**
- 08:00 ART (11:00 UTC) — Después de que AIC actualice con los datos del día anterior
- 20:00 ART (23:00 UTC) — Actualización vespertina con el pronóstico nocturno

**GitHub Actions workflow:**
```yaml
name: Rebuild Site
on:
  schedule:
    - cron: '0 11 * * *'   # 08:00 ART
    - cron: '0 23 * * *'   # 20:00 ART
  workflow_dispatch:        # manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel Deploy Hook
        run: curl -X POST ${{ secrets.VERCEL_DEPLOY_HOOK_URL }}
```

**Cost considerations:**
- **Vercel Deploy Hooks**: Gratis en el plan Hobby (300 builds/día, más que suficiente para 2/día).
- **GitHub Actions**: Gratis para repos públicos. Si el repo es privado, 2000 min/mes gratis.
- **Open-Meteo API**: Sin límite conocido, gratuito.
- **AIC scraping**: Sin costo, solo un request HTTP.
- **WeatherAPI**: Si se reemplaza parcialmente con Open-Meteo, se reduce el uso de la key (menos calls).

### Pipeline Design Options

#### Option A: Minimal — AIC yesterday + Open-Meteo current_weather como fallback

- Scrapear AIC en build time (un fetch a la página, parsear la tabla HTML)
- Agregar `current_weather=true` a la llamada Open-Meteo existente
- Usar current_weather como fallback cuando WeatherAPI no tiene key/falla
- Mostrar "Ayer la estación AIC midió: mín X°C, máx Y°C, Z mm precipitación"
- Agregar daily API de Open-Meteo para snowfall_sum y precipitation_sum
- Un cron diario (GitHub Action + Vercel Deploy Hook)

**Efecto:** ~50 líneas nuevas de código. Sin tocar la UI principal, solo agregar datos al pipeline.

#### Option B: Full — AIC + Open-Meteo current_weather + refactor NowCard

- Todo lo de Option A
- Refactor del NowCard para usar Open-Meteo current_weather como fuente PRIMARIA (más confiable para Caviahue)
- WeatherAPI pasa a ser fallback decorativo (solo para icon/condition text)
- Agregar daily API (snowfall_sum, precipitation_sum, temp_min/temp_max) como datos diarios directos
- Mostrar "ayer vs. hoy" completo: "Ayer: -2°C / 6°C, 0mm lluvia. Hoy: -6°C / 6°C, se esperan 8cm de nieve fresca"
- Dos deploys diarios (08:00 y 20:00 ART)
- Metadatos de fuente en la UI (mostrar "datos AIC" vs "pronóstico Open-Meteo")

**Efecto:** ~150-200 líneas nuevas. Toque en UI del NowCard y la data pipeline.

#### Option C: Conservative — Solo Open-Meteo current_weather, sin AIC

- Agregar `current_weather=true` a la llamada Open-Meteo
- Usarlo como fallback de WeatherAPI
- Sin scraping AIC (evita fragilidad)
- Un cron diario
- Agregar daily API de Open-Meteo

**Efecto:** ~30 líneas nuevas. Mínimo riesgo. No hay datos reales de estación.

### Open-Meteo Daily API (cross-cutting)

Independientemente de la opción, la daily API de Open-Meteo vale la pena:

```json
{
  "daily": {
    "temperature_2m_max": [6.2, 7.6, ...],
    "temperature_2m_min": [-6.1, 0.2, ...],
    "snowfall_sum": [0.00, 0.00, 8.61, 13.72, ...],
    "precipitation_sum": [0.00, 0.00, 13.80, 19.70, ...],
    "precipitation_probability_max": [2, 0, 0, 61, ...]
  }
}
```

Actualmente el Gurú deriva daily summaries desde datos horarios. La daily API da:
- **snowfall_sum** (cm): dato DIRECTO de nieve acumulada por día — actualmente se estima desde hourly.
- **precipitation_sum** (mm): total diario de precipitación.
- **temperature_2m_max/min**: más precisos que derivarlos de hourly (el hourly da el valor exacto de esa hora, no la max/min real del día).
- **precipitation_probability_max**: máxima probabilidad de precipitación del día.

**Veredicto:** ✅ Vale la pena. Agregar `daily=` a la llamada Open-Meteo existente. Es un cambio trivial (agregar parámetros a la URL) y da datos más precisos.

### AIC Coordinates Mismatch

Dato importante descubierto:
- **AIC estación Caviahue**: -37.860000, -71.080818
- **CAVIAHUE_COORDS en open-meteo-api.ts**: -37.85, -71.05

Hay una diferencia de ~0.01° lat (~1.1km) y ~0.03° lon (~2.4km). No es crítica para pronóstico meteorológico, pero vale la pena alinearlas si vamos a referenciar datos de la estación, o al menos documentar que las coordenadas de Open-Meteo son el centro del pueblo y las de AIC la ubicación exacta de la estación.

### Recommendation

**Option B (Full)** con estas precisiones:

1. **AIC scraping**: Solo el tab "Mediciones" (datos de ayer). Usar `cheerio` o regex simple para parsear la tabla HTML. No tocar los charts.

2. **Open-Meteo current_weather**: Agregar a `buildOpenMeteoUrl()` el parámetro `current_weather=true`. Crear un tipo `OpenMeteoCurrentWeather` y normalizarlo. Usarlo como fuente primaria para el NowCard cuando no haya WeatherAPI.

3. **Daily API**: Agregar parámetros `daily=` a la llamada existente. Crear tipo `OpenMeteoDailyResponse`. Almacenar los datos diarios en `NormalizedSnowForecast`.

4. **Pipeline de datos "ayer vs hoy"**: En `weather-source.ts`, juntar AIC data (ayer) con Open-Meteo forecast (hoy + 16 días). Pasar `yesterday` al Gurú para que pueda decir "ayer la estación midió X, hoy se espera Y".

5. **GitHub Actions**: Crear `.github/workflows/rebuild.yml` con dos schedules diarios. Crear Vercel Deploy Hook y configurarlo como secret de GitHub.

6. **NowCard**: Refactorizar para mostrar fuente combinada. Datos críticos (temp, wind) de Open-Meteo current_weather. Datos decorativos (icon, condition text) de WeatherAPI cuando está disponible.

### Risks

- **AIC scraping**: Fragilidad si AIC cambia su HTML, dominio, o migra la plataforma. Mitigación: implementar con graceful fallback (si falla scraping, no mostrar datos AIC, no romper el build).
- **ASP.NET WebForms**: El __VIEWSTATE puede expirar o cambiar. Mitigación: solo scrapeamos el HTML inicial que no requiere POST.
- **Frecuencia de datos AIC**: Es diaria, con datos del día anterior. No sirve para "now", solo para contexto histórico de ayer.
- **Vercel Deploy Hook**: Si se abusa, puede consumir el presupuesto de builds. Mitigación: máximo 2 deploys/día + manual.
- **Open-Meteo daily API cambia**: El schema de Open-Meteo es estable, pero monitorear changelog.
- **Coordenadas inconsistentes**: La estación AIC está a ~2.5km de las coordenadas usadas actualmente. No afecta el pronóstico pero puede confundir si mostramos ambas.

### Ready for Proposal

Yes
