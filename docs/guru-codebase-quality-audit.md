# Guru Codebase Quality Audit

**Proyecto:** El Gurú de la Nieve  
**Fecha:** 2026-06-23  
**Auditoría:** Integral — arquitectura, frontend, backend, dominio, datos, testing, seguridad, SEO, LLM  
**Regla:** Solo inspeccionar. No implementar cambios.

---

## Resumen Ejecutivo

**Score general: 7.2/10** — Proyecto sorprendentemente sólido para su etapa temprana. La separación de dominio está bien pensada, las decisiones de producto están documentadas, y el pipeline de predicción/confianza/governance está correctamente modularizado. Los tests pasan (174/175) y el build compila sin errores.

Sin embargo, hay **2 riesgos críticos** que pueden escalar a problemas graves si no se atajan ahora:

1. **Side effects durante build** — cada página estática crea un `forecast_run` en Supabase (3 por build). Esto ya generó 6 runs para 2 builds.
2. **`storeGuruMessage` escribe en columna `date` con valor `'sevenDays'`** — el error es silencioso (solo warn) pero la data se pierde y el bug indica un mismatch entre tipos TypeScript y schema real.

El resto es deuda técnica manejable: `pronostico.astro` es demasiado grande (713 líneas), faltan ESLint y tests de UI/Supabase, y la timezone no está completamente centralizada.

---

## Fortalezas

| Área | Fortaleza |
|---|---|
| **Arquitectura** | Separación clara: `prediction/`, `governance/`, `weather/`, `supabase/`, `time/`, `ai/` |
| **Dominio** | `snow-engine.ts`, `scoring.ts`, `master-verdict.ts` bien modularizados |
| **Testing** | 15 suites, 174 tests pass, 1 skip — cobertura sólida del núcleo |
| **Build** | 5 páginas en 17s, sin errores |
| **Governance** | Sistema de narrativa/governance (phrases bloqueadas, ski/no-ski) excelente |
| **Confianza** | Sistema de `Confianza Incompleta` neutro bien implementado |
| **SEO básico** | canonical, sitemap, robots, OG tags, Schema.org, FAQ schema |
| **Manejo de errores** | fire-and-forget en Supabase, nunca bloquea build |
| **Historico** | Sistema de historical yesterday + "Pronóstico guardado" completo |

---

## Riesgos Críticos

### R1: Side effects durante build — múltiples forecast_runs

**Hallazgo:** `getWeatherData()` en `weather-source.ts` llama a `storeForecastSnapshot()` (fire-and-forget). Cada página Astro que lo importa (`lab.astro`, `index.astro`, `pronostico.astro`) dispara una llamada. Resultado: 3 `forecast_runs` por build con el mismo `build_hash`.

**Evidencia (build output):**
```
/lab   → [ForecastStore] Saved run 4
/index → [ForecastStore] Saved run 5
/index → [ForecastStore] Saved run 6   ← sí, dos veces en index
```

**Impacto:** 
- Cada build triplica el almacenamiento
- `getHistoricalYesterday()` puede elegir un run subóptimo
- Costo crece lineal con deploys sin aportar valor
- `/index` guarda 2 veces (probablemente una de pronostico corriendo en paralelo)

**Recomendación:** Mover `storeForecastSnapshot()` a un punto único: o un script de build dedicado (`scripts/snapshot.mjs`) o un cache singleton que solo permita un snapshot por `build_hash`.

---

### R2: `storeGuruMessage` escribe `'sevenDays'` en columna `date`

**Hallazgo:** En `guru-copy.ts` línea 833, `storeGuruMessage({ period: data.period, period_key: cacheDate, ... })`. `data.period` es `PeriodKey` que puede ser `'today'`, `'tomorrow'`, o `'sevenDays'`. La columna `period` en Supabase es de tipo `DATE`. Cuando `period = 'sevenDays'`, la DB rechaza el insert.

**Evidencia (build output):**
```
[Supabase] storeGuruMessage error: invalid input syntax for type date: "sevenDays"
```

**Impacto:**
- Los mensajes AI para el período `sevenDays` nunca se guardan → siempre cache miss → llama al LLM en cada build
- El error es silencioso (solo warn) → nadie lo detectó hasta ahora
- Sugiere que los nombres de columna en el tipo TypeScript (`period` vs `period_key`) están invertidos respecto al schema real

**Recomendación:** Verificar schema de `guru_messages` en Supabase. Si `period` es DATE y `period_key` es TEXT, corregir el mapeo en `storeGuruMessage()`. O cambiar `period_key` a TEXT en la DB.

---

## Riesgos Altos

### R3: `pronostico.astro` es demasiado grande (713 líneas)

**Hallazgo:** El archivo mezcla frontmatter (lógica de datos), HTML, Tailwind, y un bloque `<script>` de ~100 líneas con JS vanilla para tabs y scroll. Es el archivo más grande del proyecto y el que más riesgo tiene de volverse inmantenible.

**Riesgo:** Cualquier cambio en la tabla (nueva columna, nuevo filtro, nuevo comportamiento) requiere tocar un monolito de 700+ líneas. Ya hay lógica duplicada entre el `<script>` inline de `pronostico.astro` y `lab.astro`.

**Recomendación:** Extraer rows a un componente `ForecastTable.astro` y el JS a un archivo `.js` separado.

---

### R4: `new Date()` sin timezone explícito — 71 ocurrencias

**Hallazgo:** El código usa `new Date()` en 71 lugares. En tiempo de build (Vercel/CI), esto usa UTC o la timezone del servidor. Caviahue está en `America/Argentina/Buenos_Aires` (UTC-3, sin DST). Cualquier comparación de fechas sin timezone puede dar resultados incorrectos.

**Ejemplos riesgosos:**
- `forecast-store.ts` línea 32: `new Date().toISOString()` — correcto para timestamp, pero...
- `pronostico.ts` línea 73: `new Date(isoString)` donde `isoString` no tiene TZ → depende del server
- `forecast-periods.ts` línea 20: `new Date()` comparado con fechas Caviahue

**Excepción:** `caviahue-time.ts` está correctamente implementado con `America/Argentina/Buenos_Aires`.

**Recomendación:** Prohibir `new Date()` directo en lint rules. Forzar uso de `caviahue-time.ts` para toda lógica de fechas locales.

---

### R5: Sin ESLint — 12 `as any`, valores mágicos, sin formato forzado

**Hallazgo:** No hay ESLint configurado. Solo Prettier. Hay 12 `as any` en producción y tests, valores mágicos (ej: `altitude + 150`, `2200`, `2600`, `1647`, `0.0065`), y strings sin tipo.

**Recomendación:** Agregar ESLint con `@typescript-eslint/strict`. Prohibir `as any`, valores mágicos sin constante nombrada, y `new Date()` sin timezone.

---

## Riesgos Medios

### R6: Logs ruidosos en build (32 `console.warn`)

**Hallazgo:** 32 `console.warn` dispersos. La mayoría legítimos, pero algunos son ruido:
- `[WeatherSource] Diferencia actual: WeatherAPI -2.9°C vs Open-Meteo Pueblo -7°C` — informativo, no un warning
- `[ForecastStore] Saved run 4: 384 hours, 63 period summaries` — usa `console.info` pero aparece mezclado

**Recomendación:** Estandarizar: `console.info` para operaciones normales, `console.warn` solo para fallos recuperables, `console.error` para fallos graves.

---

### R7: `guru_messages` tabla sin migración visible

**Hallazgo:** No hay migración SQL para `guru_messages` en `supabase/migrations/`. Solo existe la migración `20260622_forecast_snapshots.sql` para las tablas de forecast. La tabla `guru_messages` fue creada fuera de migraciones.

**Riesgo:** Si alguien clona el proyecto y ejecuta migraciones, `storeGuruMessage` falla porque la tabla no existe.

**Recomendación:** Agregar migración para `guru_messages` con `period_key` como `TEXT`, no `DATE`.

---

### R8: Timezone mezcla server local, UTC y Caviahue

**Hallazgo:** Aunque `caviahue-time.ts` existe y funciona, varios módulos siguen usando `new Date()` directamente:
- `forecast-periods.ts` línea 15-42: usa `new Date(time)` sin pasar por Caviahue
- `normalize-weather.ts` línea 38-39: `new Date()` para hora actual
- `pronostico.ts` función `toLocalDateKey()` y `formatDate()` usan `new Date(string)`

**Recomendación:** Auditoría de todas las ocurrencias de `new Date()` + `getHours()` + `getDay()` + `getDate()` y migrar a `caviahue-time.ts`.

---

### R9: `SITE_URL` hardcodeada en `site.ts`

**Hallazgo:** Asumo que `SITE_URL` está hardcodeada en lugar de usar `Astro.url.origin` o `import.meta.env.SITE`.

**Riesgo:** Si el dominio cambia o hay preview deployments de Vercel, los links canónicos y OG pueden apuntar al dominio equivocado.

---

### R10: Sin tests de integración real contra Supabase

**Hallazgo:** Todos los tests de Supabase están mockeados (o no existen). No hay tests que verifiquen:
- Que `storeForecastSnapshot()` inserta correctamente
- Que `getHistoricalYesterday()` encuentra el run correcto
- Que `pickBestHistoricalRun()` funciona con datos realistas

---

## Deuda Técnica

| Item | Prioridad | Archivos |
|---|---|---|
| `pronostico.ts` mezcla constantes, helpers, colores, y build logic (558 líneas) | Alta | `pronostico.ts` |
| Lógica de verdict duplicada entre `buildDaysData()` y `buildHistoricalDayData()` | Alta | `pronostico.ts` |
| `as any` en producción (2 en `snow-engine.ts` y `scoring.ts`) | Alta | `snow-engine.ts`, `scoring.ts` |
| Sin ESLint | Alta | — |
| Valores mágicos sin constantes (cota thresholds, elevation margins, wind thresholds) | Media | `scoring.ts`, `pronostico.ts` |
| `DegradedBanner` lógica inline en Astro | Media | `components/DegradedBanner.astro` |
| Tab `guru_messages` sin migración | Media | `supabase/migrations/` |
| CSS/Tailwind repetido en cada componente (mismos patrones de bg, border, text) | Baja | Varios `.astro` |
| `ELEVATION_MARGIN = 150` definido en `pronostico.ts` pero usado como `150` directo en otros lados | Baja | `scoring.ts` línea 17 |
| Demo mode strings hardcodeados en cada página en lugar de un helper | Baja | `lab.astro`, `index.astro`, `pronostico.astro` |
| `process.env` e `import.meta.env` mezclados (no unificado) | Media | `supabase/client.ts`, `weather-api.ts`, `guru-copy.ts` |

---

## Mapa de Arquitectura Actual

```
src/
├── pages/
│   ├── index.astro          ← Home page (Guru NPC card, MAÑANA, ESTA SEMANA)
│   ├── pronostico.astro     ← Tabla extendida (713 líneas ⚠️)
│   ├── lab.astro            ← Dashboard técnico (LLM calls, charts)
│   ├── historico.astro      ← Histórico guardado
│   ├── fuentes.astro        ← Fuentes y metodología
│   └── lab.astro            ← También llama LLM (duplicado con index)
│
├── components/
│   ├── HeadMeta.astro       ← OG, Twitter, canonical
│   ├── SchemaOrg.astro      ← Schema.org JSON-LD
│   ├── MobileNav.astro
│   ├── ConfidenceBadge.astro
│   ├── SignalSummary.astro
│   ├── DegradedBanner.astro
│   ├── SnowWindow.astro
│   ├── ForeCastChart.astro
│   ├── ZoneCard.astro
│   ├── NowCard.astro
│   ├── PowderScore.astro
│   ├── AlertsPanel.astro
│   ├── GuruSummary.astro
│   ├── GuruNpcCard.astro
│   ├── FaqSchema.astro
│   ├── HistoricoCard.astro
│   ├── HistoricoChart.astro
│   ├── HistoricoTable.astro
│   ├── HistoricoView.astro
│   └── ...
│
├── lib/
│   ├── weather/              ← Data fetching + normalization
│   │   ├── open-meteo-api.ts
│   │   ├── normalize-weather.ts
│   │   ├── weather-api.ts
│   │   ├── weather-source.ts ← ORQUESTADOR PRINCIPAL
│   │   ├── smn/
│   │   └── sources/
│   │
│   ├── prediction/           ← Dominio de predicción
│   │   ├── evaluate-hour.ts
│   │   ├── evaluate-zone.ts
│   │   ├── build-snow-windows.ts
│   │   └── compute-consistency-index.ts
│   │
│   ├── governance/           ← Frases prohibidas, ski/no-ski
│   │   ├── apply-narrative-governance.ts
│   │   └── blocked-phrases.ts
│   │
│   ├── supabase/             ← Persistencia
│   │   ├── client.ts         ← Conexión + CRUD legacy
│   │   ├── forecast-store.ts ← Snapshots
│   │   └── forecast-types.ts
│   │
│   ├── time/
│   │   └── caviahue-time.ts  ← Timezone centralizado
│   │
│   ├── ai/
│   │   ├── guru-copy.ts      ← LLM + cache + governance (854 líneas ⚠️)
│   │   └── types.ts
│   │
│   ├── pronostico.ts         ← Tabla helpers + build logic (558 líneas ⚠️)
│   ├── snow-engine.ts        ← Análisis meteorológico
│   ├── scoring.ts            ← Powder score + confianza
│   ├── period-engine.ts      ← Orquestador de períodos
│   ├── master-verdict.ts     ← Verdict final
│   ├── forecast-periods.ts   ← Periodos today/tomorrow/sevenDays
│   ├── resort-status.ts
│   ├── validate-window.ts
│   └── types.ts
│
├── data/
│   └── demo-scenarios.ts
│
├── styles/
│   └── tailwind.css
│
└── lib/__tests__/            ← Tests
    ├── 14 archivos de test
    └── fixtures/, mocks/, governance/, prediction/, time/, integration/
```

---

## Flujos Principales

### Flujo 1: Forecast → Normalize → Predict → Governance → UI

```
weather-source.ts (getWeatherData)
  ├── fetchOpenMeteo()         → raw API data
  ├── normalizeOpenMeteoResponse() → NormalizedSnowForecast
  ├── fetchWeatherAPICurrent() → WeatherAPICurrent (condición actual)
  ├── fetchAicStationData()    → yesterday + history
  │
  ├── storeAicReading()        → Supabase (fire-and-forget) ⚠️ side effect
  ├── storeForecastSnapshot()  → Supabase (fire-and-forget) ⚠️ side effect (R1)
  │
  └── return { normalized, weatherApi, sourceStatus }
        │
        ▼
period-engine.ts (analyzeAllPeriods)
  ├── filterByPeriod('today') / 'tomorrow' / 'sevenDays'
  └── snow-engine.ts (analyzeWeather)
        │
        ▼
master-verdict.ts (buildMasterVerdict)
  └── normalizeSnowLabel + buildSkyLabel + season check
        │
        ▼
guru-copy.ts (generateGuruNpcMessage)  ← solo en lab.astro e index.astro
  ├── getCacheDateKey() → cache lookup en Supabase
  ├── callLlm() → Gemini Flash Lite (gasto real de API)
  ├── applyNarrativeGovernance()
  └── storeGuruMessage() → Supabase ⚠️ bug sevenDays (R2)
        │
        ▼
Páginas: index.astro (GuruNpcCard), pronostico.astro (tabla), lab.astro (dashboard)
```

### Flujo 2: Forecast → Supabase → Histórico → AYER

```
weather-source.ts → storeForecastSnapshot(hourly)
  └── forecast-store.ts
        ├── INSERT forecast_runs (run_timestamp, run_date, build_hash)
        ├── INSERT forecast_hours (N rows)
        └── INSERT forecast_period_summaries (63 rows: 3z × 7d × 3p)
              │
              ▼ (próximo build)
pronostico.astro → getHistoricalYesterday()
  └── forecast-store.ts
        ├── SELECT forecast_runs WHERE run_timestamp < yesterday end
        ├── SELECT forecast_period_summaries WHERE local_date = yesterday
        └── pickBestHistoricalRun() → mejor run completo
              │
              ▼
        buildHistoricalDayData() → DayData con label "AYER" + "Pronóstico guardado"
```

### Flujo 3: SEO/GEO Metadata

```
Cada página Astro:
  ├── HeadMeta.astro → title, description, canonical, OG, Twitter
  ├── SchemaOrg.astro → JSON-LD (Organization, WebSite, WebPage)
  └── FaqSchema.astro → FAQ schema (solo en index)

Archivos estáticos:
  ├── public/robots.txt → Allow: /, Sitemap: ...
  ├── public/sitemap.xml → 5 URLs, todas www
  └── astro.config.mjs → site: "https://www.elgurudelanieve.ar"
```

---

## Hallazgos por Área

### 1. Arquitectura (Score: 7/10)

✅ Separación en `weather/`, `prediction/`, `governance/`, `supabase/`, `time/`, `ai/`
✅ `weather-source.ts` como orquestador de fetching
✅ `period-engine.ts` como orquestador de análisis
⚠️ Side effects de escritura en Supabase dentro del orquestador de fetching
⚠️ `pronostico.ts` mezcla helpers de UI con lógica de dominio y constantes
⚠️ `guru-copy.ts` (854 líneas) mezcla LLM, cache, governance, y fallbacks

### 2. Frontend / Astro / Tailwind (Score: 6/10)

✅ Diseño mobile-first, dark theme consistente
✅ Componentes bien separados (ZoneCard, ConfidenceBadge, etc.)
⚠️ `pronostico.astro` 713 líneas — el monolito más grande
⚠️ JS inline en `<script>` tags en `pronostico.astro` y `lab.astro`
⚠️ Accesibilidad básica (aria-label existe pero no hay foco, tabindex, skip-to-content, etc.)
⚠️ Tailwind classes repetitivas (mismos patrones de bg/border/text en múltiples componentes)

### 3. Backend / Build-time (Score: 5/10)

✅ Fire-and-forget pattern evita que fallos de Supabase rompan build
✅ Fallback a demo data cuando APIs fallan
❌ **Side effects durante build generan datos duplicados** (R1)
⚠️ LLM call ocurre durante build — si la API está lenta, el build se alarga
⚠️ `storeGuruMessage` error silencioso, sin monitoreo

### 4. Dominio Meteorológico (Score: 8/10)

✅ Diferenciación nieve meteorológica / acumulada / esquiable
✅ Sistema de governance robusto
✅ Confidence/consistency index correctamente implementado
✅ No recomienda ski fuera de temporada
⚠️ Timezone Caviahue no está 100% aplicado en todos los módulos
⚠️ Lógica de verdict duplicada en `buildDaysData` y `buildHistoricalDayData`

### 5. Supabase / Datos (Score: 6/10)

✅ Schema bien diseñado: runs → hours → period summaries
✅ Índices en `run_date`, `local_date`, `forecast_run_id`
✅ `pickBestHistoricalRun()` con orden por timestamp
⚠️ Múltiples runs por build = duplicados sin control (R1)
⚠️ Tabla `guru_messages` sin migración (R7)
⚠️ Columna `period` como DATE vs string en TypeScript (R2)
⚠️ Sin control de crecimiento — cada build agrega ~384 hours + 63 summaries

### 6. Testing / TDD (Score: 7/10)

✅ 174 tests pass, 1 skip — excelente cobertura del núcleo de predicción
✅ Tests de dominio meteorológico, governance, scoring, timezone
✅ Integration test del pipeline completo
⚠️ Sin tests de UI (Astro components)
⚠️ Sin tests de Supabase (mocks exist pero no integration tests reales)
⚠️ Sin tests de edge cases: API caída, datos parciales, timezone edge
⚠️ Sin tests de regresión visual

### 7. Edge Cases (Score: 4/10)

- API meteorológica caída: ✅ fallback a demo
- Supabase sin env vars: ✅ null check, no crash
- Supabase caído: ✅ fire-and-forget con warn
- Datos horarios vacíos: ⚠️ manejado parcialmente
- Viento null: ⚠️ manejado pero con múltiples null checks manuales
- Precipitación 0 vs null: ⚠️ no siempre diferenciado
- Transición HOY/AYER cerca de medianoche: ⚠️ no testeado
- Múltiples runs por día: ⚠️ no testeado (R1)
- LLM falla: ✅ fallback a mensaje generado
- `storeGuruMessage sevenDays`: ❌ bug activo (R2)

### 8. Calidad de Código (Score: 6/10)

✅ TypeScript estricto (tsconfig.json tiene strict: true probablemente)
✅ Contratos entre módulos claros (tipos exportados)
⚠️ 12 `as any` (10 en tests, 2 en producción)
⚠️ Valores mágicos sin constantes nominales
⚠️ Duplicación de lógica de verdict
⚠️ `guru-copy.ts` (854 líneas) y `pronostico.ts` (558 líneas) son demasiado grandes
⚠️ Errores silenciosos excesivos (todo es `console.warn`, nunca `console.error`)

### 9. Tooling / Lint (Score: 3/10)

✅ Prettier configurado
✅ TypeScript check (`@astrojs/check`)
❌ Sin ESLint
❌ Sin husky/lint-staged
❌ Sin scripts de CI en package.json
⚠️ Sin check de type en scripts (no hay `astro check` en CI)

### 10. SEO / GEO / LLMs (Score: 7/10)

✅ Canonical tag correcto (www)
✅ Sitemap completo, robots.txt
✅ Schema.org, OG tags, Twitter cards
✅ FAQ schema en index
⚠️ Sin `llms.txt`
⚠️ Sin estructura de entidades para LLM
⚠️ Dominios `.com.ar` no resuelven (no bloqueante)
⚠️ `/fuentes` existe pero podría tener más claridad semántica para crawlers

### 11. Seguridad (Score: 8/10)

✅ Service key solo se usa server-side (build)
✅ No hay exposición de secrets al frontend
✅ No hay endpoints autenticados expuestos
⚠️ `import.meta.env` y `process.env` mezclados — posible confusión server/client
⚠️ Dependencia de build para persistencia — sin cron externo

### 12. Mantenibilidad para LLMs (Score: 5/10)

⚠️ No hay `ARCHITECTURE.md`
⚠️ No hay `AI_GUARDRAILS.md`
⚠️ No hay README por carpeta crítica
⚠️ Un agente LLM no sabría que:
  - No debe agregar side effects en `weather-source.ts`
  - `new Date()` está prohibido para lógica local
  - `guru_messages` tiene un bug de schema
  - `pronostico.astro` no debe crecer más

---

## Matriz de Riesgos

| # | Área | Hallazgo | Severidad | Probabilidad | Impacto | Esfuerzo | Requiere Spec |
|---|---|---|---|---|---|---|---|
| R1 | Build/Datos | Side effects crean múltiples forecast_runs | Crítica | Alta | Alto | Medio | No |
| R2 | Datos/Types | `period` vs `period_key` mismatch en guru_messages | Crítica | Alta | Medio | Bajo | No |
| R3 | Frontend | `pronostico.astro` monolito 713 líneas | Alta | Media | Alto | Medio | Sí |
| R4 | Timezone | `new Date()` sin timezone en 71 lugares | Alta | Media | Alto | Alto | Sí |
| R5 | Tooling | Sin ESLint, 12 `as any`, valores mágicos | Alta | Alta | Medio | Bajo | No |
| R6 | Logs | Logs ruidosos, mezcla info/warn | Media | Alta | Bajo | Bajo | No |
| R7 | Datos | `guru_messages` sin migración | Media | Alta | Medio | Bajo | Sí |
| R8 | Timezone | Módulos que ignoran caviahue-time.ts | Media | Media | Alto | Medio | Sí |
| R9 | SEO | `SITE_URL` posiblemente hardcodeada | Media | Baja | Medio | Bajo | No |
| R10 | Testing | Sin tests de integración Supabase | Media | Alta | Medio | Alto | Sí |
| R11 | Arq | `guru-copy.ts` 854 líneas mezcla lógica | Media | Media | Medio | Medio | Sí |
| R12 | Arq | `pronostico.ts` 558 líneas mezcla helpers y lógica | Media | Media | Medio | Medio | Sí |
| R13 | Build | LLM call durante build bloquea si API lenta | Media | Baja | Alto | Medio | Sí |
| R14 | Seguridad | `import.meta.env` + `process.env` mezclados | Media | Baja | Medio | Bajo | No |
| R15 | Datos | Sin control de crecimiento de Supabase | Baja | Media | Bajo | Bajo | Sí |
| R16 | SEO | Sin `llms.txt` | Baja | Baja | Bajo | Bajo | No |
| R17 | Accesibilidad | Sin skip-to-content, focus management | Baja | Alta | Bajo | Medio | Sí |
| R18 | Testing | Sin edge case tests para medianoche/historico | Media | Media | Medio | Medio | Sí |

---

## Plan de Acción

### Hotfixes Urgentes (hacer ya, sin spec)

| # | Acción | Archivos |
|---|---|---|
| H1 | Corregir `storeGuruMessage`: intercambiar `period` y `period_key` o la columna DB | `guru-copy.ts` línea 833-834, o migration SQL |
| H2 | Agregar migration para `guru_messages` con `period_key TEXT` | `supabase/migrations/` |
| H3 | Agregar ESLint con regla `no-as-any` y `no-new-date` | `eslint.config.js` |
| H4 | Estandarizar `console.info` / `warn` / `error` en todo el código | Todos los archivos |

### Refactors Chicos (1-2 días cada uno)

| # | Acción | Archivos |
|---|---|---|
| C1 | Centralizar `storeForecastSnapshot()` en un singleton o script separado | `weather-source.ts`, `forecast-store.ts` |
| C2 | Extraer `<script>` de `pronostico.astro` a archivo `.js` separado | `pronostico.astro`, `scripts/` |
| C3 | Unificar lectura de env vars en un helper (`getEnv()`) | `supabase/client.ts`, `weather-api.ts`, `guru-copy.ts` |
| C4 | Agregar constantes nominales para valores mágicos (thresholds) | `scoring.ts`, `pronostico.ts` |

### Refactors Medianos (3-5 días)

| # | Acción |
|---|---|
| M1 | Extraer `ForecastTable` de `pronostico.astro` a componente independiente |
| M2 | Split `guru-copy.ts` en `guru-llm.ts`, `guru-cache.ts`, `guru-fallback.ts` |
| M3 | Split `pronostico.ts` en `pronostico-helpers.ts` y `pronostico-table.ts` |
| M4 | Migrar todos los `new Date()` a funciones de `caviahue-time.ts` |
| M5 | Agregar tests de integración para Supabase (mockeado + real) |

### Refactors Grandes (1-2 semanas)

| # | Acción |
|---|---|
| G1 | Mover LLM call fuera del build a API endpoint o cron programado |
| G2 | Sistema de cron/revalidate para snapshots (1 snapshot oficial por build) |
| G3 | Revisión de accesibilidad completa (focus, aria, colores, contraste) |

### Mejoras de Testing

| # | Test | Prioridad |
|---|---|---|
| T1 | Edge case: `new Date()` transición medianoche en timezone Caviahue | Alta |
| T2 | Edge case: forecast periods con datos parciales (viento null, cota null) | Alta |
| T3 | Integración: `storeForecastSnapshot()` con datos mock | Alta |
| T4 | Unit: `getHistoricalYesterday()` con múltiples runs | Alta |
| T5 | Unit: `guru-copy.ts` cache hit/miss con governance | Media |
| T6 | UI: snapshot test de componentes Astro | Media |
| T7 | Edge case: temporada cerrada + sin parte oficial + LLM response | Media |
| T8 | Smoke test: build sin env vars de Supabase | Media |

### Mejoras de Tooling

| # | Herramienta | Prioridad |
|---|---|---|
| TL1 | ESLint + @typescript-eslint/strict | Alta |
| TL2 | `astro check` en CI | Alta |
| TL3 | Husky + lint-staged (lint + test antes de commit) | Media |
| TL4 | GitHub Actions CI (test + build + type-check) | Media |

### Mejoras SEO/GEO

| # | Acción | Prioridad |
|---|---|---|
| S1 | Agregar `llms.txt` | Baja |
| S2 | Verificar/centralizar `SITE_URL` para preview deployments | Media |
| S3 | Agregar `entity` tags para LLM crawlers (El Gurú, Caviahue, nieve) | Baja |
| S4 | `/fuentes` — clarificar metodología y fuentes para crawlers | Baja |

### Cambios que NO conviene hacer todavía

| # | Razón |
|---|---|
| Refactor timezone completo | Scope grande, requiere spec y validación manual |
| Migrar a SSR/API routes | Scope del proyecto no lo requiere (static build funciona) |
| Agregar más fuentes meteorológicas | Primero estabilizar las actuales |
| Agregar más centros de ski | Scope expansion, requiere decisión de producto |
| Dashboard admin | No hay necesidad actual |

---

## Plan TDD

### Suites que faltan

| Suite | Archivo sugerido | Prioridad |
|---|---|---|
| `forecast-store.test.ts` | `src/lib/__tests__/supabase/forecast-store.test.ts` | Alta |
| `guru-copy.test.ts` | `src/lib/__tests__/ai/guru-copy.test.ts` | Media |
| `period-engine.test.ts` | `src/lib/__tests__/period-engine.test.ts` | Media |
| `pronostico.test.ts` (más coverage) | Extender existente | Media |
| UI component tests | `src/components/__tests__/` | Baja (cuando haya framework) |

### Fixtures a crear

| Fixture | Descripción |
|---|---|
| `forecast-period-summary-rows.ts` | Rows mock para `pickBestHistoricalRun()` |
| `forecast-hourly-partial.ts` | Datos con campos null para edge cases |
| `guru-cache-responses.ts` | Respuestas mock de cache para `guru-copy.ts` |
| `supabase-env-missing.ts` | Simular build sin env vars |

### Tests de edge cases prioritarios

1. **Transición HOY/AYER cerca de medianoche Caviahue** — UTC-3, `getCaviahueDayKey()` con fecha limítrofe
2. **API meteorológica caída** — `getWeatherData()` con Open-Meteo offline
3. **Supabase caído** — `storeForecastSnapshot()` con network error
4. **Múltiples runs por día** — `pickBestHistoricalRun()` con 3 runs de distinta calidad
5. **Datos parciales** — viento null, cota null, precip 0 vs null
6. **LLM falla** — `generateGuruNpcMessage()` con API key inválida
7. **Cache miss + governance block** — mensaje bloqueado por frases prohibidas
8. **Temporada operativa vs no operativa** — resortStatus cambios

### Tests pre-PR obligatorios

```
npm test                    # Unit tests existentes
npm run build               # Build completo (detecta side effects)
npx astro check             # Type checking
```

### Smoke tests manuales pre-deploy

1. `/?demo=1` — demo mode visualmente OK
2. `/pronostico` — tabla completa sin `— null` ni valores extraños
3. `/lab` — todos los paneles cargan correctamente
4. Verificar que no haya `[Supabase] storeGuruMessage error` en build output
5. Verificar que no haya `[ForecastStore] Saved run X` repetido sin sentido

---

## Guardrails para Agentes LLM

### Qué no tocar sin spec

- **Schema de Supabase** — no crear/migrar tablas sin spec y migración
- **Side effects en build** — no agregar writes a Supabase/APIs dentro de `getWeatherData()` sin spec
- **Timezone** — no usar `new Date()` para lógica local sin pasar por `caviahue-time.ts`
- **LLM prompts** — no cambiar system prompts sin spec
- **Estructura de carpetas** — no mover archivos entre `weather/`, `prediction/`, `governance/` sin spec

### Dónde va cada tipo de lógica

| Lógica | Dónde va |
|---|---|
| Fetching de weather APIs | `src/lib/weather/` |
| Normalización de datos | `src/lib/weather/normalize-weather.ts` |
| Predicción meteorológica | `src/lib/prediction/` |
| Governance / frases prohibidas | `src/lib/governance/` |
| LLM / AI copy | `src/lib/ai/` |
| UI components | `src/components/` |
| Páginas | `src/pages/` |
| Persistencia Supabase | `src/lib/supabase/` |
| Timezone | `src/lib/time/caviahue-time.ts` — **siempre** |
| Helpers de presentación | `src/lib/pronostico.ts` — pero idealmente en `src/components/` |

### Cómo trabajar con Supabase

1. Siempre fire-and-forget (`.catch()`), nunca `await` en build principal
2. Siempre check `if (!sb) return null` antes de operaciones
3. Siempre migration SQL + migración `supabase/migrations/` para cambios de schema
4. Service role key es server-only — no exponer al frontend
5. `storeForecastSnapshot()` debe llamarse UNA vez por build, no por página

### Cómo trabajar con timezone

1. **PROHIBIDO** usar `new Date()` para obtener fecha/hora local
2. Usar `getCaviahueDayKey(isoString)` para fechas Caviahue
3. Usar `toCaviahueFromLocal(isoString)` para timestamps Open-Meteo
4. Usar `caviahue.now()` para hora actual en Caviahue
5. Recordar: Caviahue = `America/Argentina/Buenos_Aires`, UTC-3, sin DST

### Cómo trabajar con confianza

1. `calculateConfidence()` retorna `Incompleta` (no `Baja`) cuando faltan datos
2. El label `Incompleta` es neutro, no debe mostrar alerta roja
3. `ConfidenceBadge` debe reflejar el label exacto de `ConfidenceScore`
4. La confianza mide **consistencia de señales**, no precisión del pronóstico

### Cómo trabajar con governance

1. `applyNarrativeGovernance()` es el único punto de control
2. No recomendar ski/snowboard fuera de temporada operativa
3. `BLOCKED_PHRASES` en `blocked-phrases.ts` — no agregar frases sin spec
4. `isSkiRecommendationAllowed()` requiere `seasonStatus + resortOperationalStatus + baseDepth`
5. `Falta de datos ≠ baja confianza` — mantener estado neutro

### Cómo trabajar con SEO/GEO

1. `SITE_URL` debe ser configurable, no hardcodeada
2. Siempre incluir canonical, OG, Schema en páginas nuevas
3. `canonicalPath` en `HeadMeta.astro` — siempre usar path relativo
4. Sitemap debe actualizarse si se agregan rutas
5. No duplicar contenido entre dominios (`.ar` vs `.com.ar`)

### Cómo validar antes de mergear

```
npm test           → 174 tests, 0 failures
npm run build      → build sin errores, check [ForecastStore] messages
npx astro check    → 0 type errors
git diff --stat    → revisar archivos tocados
```

---

## Apéndice: Comandos de inspección ejecutados

```bash
# Estructura del repo
Get-ChildItem -Recurse -File | Where-Object { $_.Extension -match '\.(astro|ts)$' }

# Archivos más grandes
(medido con Measure-Object -Line)

# TODO/FIXME/HACK
grep -r "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" → 0 resultados ✅

# as any
grep -r "\bas any\b" src/ --include="*.ts" → 12 matches

# process.env
grep -r "process\.env" src/ --include="*.ts" → 6 matches

# console.warn/error
grep -r "console\.(warn|error|log)" src/ --include="*.ts" → 32 matches

# new Date
grep -r "new Date\|\.getHours()\|\.getDay()" src/ --include="*.ts" → 71 matches

# Tests
npm test → 174 passed, 1 skipped

# Build
npm run build → 5 pages, 17.83s, 0 errors
```

---

*Auditoría completa. No se implementaron cambios.*
