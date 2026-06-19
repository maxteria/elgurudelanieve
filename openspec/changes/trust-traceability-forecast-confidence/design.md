# Design: Trust, Traceability, and Forecast Confidence

## Technical Approach

Extend the existing data pipeline with a trust layer that runs AFTER weather normalization and BEFORE UI rendering. The layer adds confidence scoring, signal extraction, narrative governance, and window validation as middleware functions that consume `SnowInterpretation` and produce enriched output. New Astro components consume the enriched types. Degraded mode is propagated as flags from `weather-source.ts` through the same pipeline.

## Architecture Decisions

### Decision: Confidence Score

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Internal 0–100 + visible label | User sees precision without false accuracy. Label (Alta/Media/Baja) is the primary UI; the numeric score is secondary in a tooltip. | **Adopted** |
| Label-only | Simpler but hides signal strength variance within a band. | Rejected |

Internal score is a weighted sum of sub-scores (see Data Flow). Visible UI: label with "(N/100)" in tooltip. Always accompanied by: "No es probabilidad de acierto, es consistencia de señales."

### Decision: Narrative Governance — Three Layers

| Layer | What | When |
|-------|------|------|
| 1. Hard rules | Compute allowed narrative intensity tier (restricted / normal / expressive) before generation | Before LLM/fallback call |
| 2. Governed prompt | Inject the tier + blocked phrases into the LLM system prompt | Prompt assembly |
| 3. Post-processing | Regex/filter scan on output; if violation found → fall back to fallback library message | After LLM/fallback returns |

This ensures the LLM never sees a prompt that lets it generate "paquetón" in restricted mode, AND if it ignores the prompt, the post-processor catches it.

### Decision: History / "dijimos vs pasó"

Design for future insertion but don't build now. The enriched `SnowInterpretation` will contain all fields needed for persistence (`confidence`, `signals`, `sources`, `timestamp`). When history is implemented, a `storeTrustLayerSnapshot()` function can be added without changing the core types.

### Decision: Window Validation

A single pure function `validateWindow(window): ValidatedWindow` in a new `src/lib/validate-window.ts`. Called in `snow-engine.ts` after `calculatePowderScore` and before constructing `bestWindow`. `SnowWindow.astro` receives only validated data.

## New Types (`src/lib/types.ts`)

```typescript
// Signal traceability per period
interface SignalSummary {
  temperature: { village: number; mid: number; top: number };
  precipitation: { village: number; mid: number; top: number };
  snowfall: { village: number | null; mid: number | null; top: number | null };
  freezingLevel: { village: number; mid: number; top: number };
  wind: { village: number; mid: number; top: number };
  humidity: { village: number | null; mid: number | null; top: number | null };
  altitudes: { village: 1647; mid: 1846; top: 2045 };
}

// Source availability per fetch
interface SourceStatus {
  openMeteo: 'ok' | 'failed' | 'demo';
  weatherApi: 'ok' | 'failed' | 'unconfigured';
  aic: 'ok' | 'failed' | 'unavailable';
}

// Confidence score
interface ConfidenceScore {
  value: number;       // 0-100
  label: 'Alta' | 'Media' | 'Baja';
  reasonsFor: string[];    // e.g. "Precipitación >60%"
  reasonsAgainst: string[];// e.g. "Freezing level alto"
}

// Governance tier
type NarrativeTier = 'restricted' | 'normal' | 'expressive';

// Validated window
interface ValidatedWindow {
  hasWindow: boolean;
  from?: string;      // ISO string, validated
  to?: string;        // ISO string, validated
  label: string;
  description: string;
}

// Enriched SnowInterpretation (extends existing)
interface TrustEnrichedInterpretation {
  signals: SignalSummary;
  confidence: ConfidenceScore;
  narrativeTier: NarrativeTier;
  validatedWindow: ValidatedWindow;
  sourceStatus: SourceStatus;
  degraded: boolean;
  guruSummary: string;          // existing, now governed
}
```

## Data Flow

```
weather-source.ts
  │  fetchOpenMeteo(), fetchWeatherAPI(), fetchAicStationData()
  │  → sourceStatus per source
  │  → degraded flag if any failed
  ▼
snow-engine.ts  (analyzeWeather)
  │  → zone hourly, zone answers, alerts
  │  → calculatePowderScore()  [scoring.ts]
  │  → validateWindow()        [validate-window.ts] NEW
  │  → calculateConfidence()   [scoring.ts] NEW
  │  → extractSignals()        [snow-engine.ts] NEW
  │  → computeNarrativeTier()  [guru-copy.ts] NEW
  ▼
TrustEnrichedInterpretation
  │  passed to pronostico.astro
  ▼
guru-copy.ts (generateGuruNpcMessage)
  │  receives: confidence, tier, sourceStatus, weather data
  │  tier → governed system prompt (layer 2)
  │  output → post-process (layer 3)
  ▼
UI Components
  GuruSummary.astro (existing, now shows governed message)
  SignalSummary.astro (NEW) — traceability block
  ConfidenceBadge.astro (NEW) — label + tooltip
  DegradedBanner.astro (NEW) — source warnings
  SnowWindow.astro (existing, now receives validated window)
```

## File Changes

| File | Action | What |
|------|--------|------|
| `src/lib/types.ts` | Modify | Add `SignalSummary`, `SourceStatus`, `ConfidenceScore`, `NarrativeTier`, `ValidatedWindow`, `TrustEnrichedInterpretation` |
| `src/lib/scoring.ts` | Modify | Add `calculateConfidence()` (0-100 + label + reasons) |
| `src/lib/validate-window.ts` | **Create** | Pure function `validateWindow()` |
| `src/lib/snow-engine.ts` | Modify | Call `validateWindow`, `calculateConfidence`, `extractSignals`; return enriched interpretation |
| `src/lib/guru-copy.ts` | Modify | Add `computeNarrativeTier()`, governed prompt assembly, post-processor filter |
| `src/lib/weather/weather-source.ts` | Modify | Return `SourceStatus` alongside `WeatherResult` |
| `src/components/SignalSummary.astro` | **Create** | Traceability block |
| `src/components/ConfidenceBadge.astro` | **Create** | Badge + tooltip |
| `src/components/DegradedBanner.astro` | **Create** | Warning banner |
| `src/pages/pronostico.astro` | Modify | Import new components, pass enriched data |

## Validation Design (`src/lib/validate-window.ts`)

Single exported function:

```typescript
function validateWindow(window: PowderScoreResult['snowWindow']): ValidatedWindow {
  if (!window) return { hasWindow: false, label: 'Sin ventana definida', description: 'No se identificó una ventana clara de acumulación.' };
  
  const { fromTime, toTime } = window;
  
  // Reject if null/empty
  if (!fromTime || !toTime) return noWindow();
  
  const from = new Date(fromTime);
  const to = new Date(toTime);
  
  // Reject if invalid dates
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return noWindow();
  
  // Reject if negative/zero duration
  if (to.getTime() <= from.getTime()) return noWindow();
  
  // Reject if in the past
  if (to.getTime() < Date.now()) return noWindow();
  
  // Accept with formatting
  return { hasWindow: true, from: formatWindowTime(fromTime), to: formatWindowTime(toTime), ... };
}
```

Message when rejected: "No hay una ventana clara de nieve en este período."

## Confidence Calculation (`src/lib/scoring.ts`)

```typescript
function calculateConfidence(
  hourly: HourlyForecast[],
  sourceStatus: SourceStatus,
  powderScore: number,
  altitude: number
): ConfidenceScore {
  let value = 50; // baseline
  const reasonsFor: string[] = [];
  const reasonsAgainst: string[] = [];

  // Source agreement (+15 if 2+ sources available)
  if (sourceStatus.openMeteo === 'ok') { value += 10; reasonsFor.push('Open-Meteo disponible'); }
  if (sourceStatus.weatherApi === 'ok') { value += 5; reasonsFor.push('WeatherAPI disponible'); }
  if (sourceStatus.aic === 'ok') { value += 5; reasonsFor.push('Validación AIC disponible'); }

  // Precipitation signal (+20 if >60%)
  const avgPrecipProb = hourly.reduce((s, h) => s + (h.precipitationProbability ?? 0), 0) / hourly.length;
  if (avgPrecipProb > 60) { value += 20; reasonsFor.push('Precipitación probable >60%'); }
  else if (avgPrecipProb > 30) { value += 10; reasonsFor.push('Precipitación posible 30-60%'); }
  else { value -= 10; reasonsAgainst.push('Precipitación baja <30%'); }

  // Temperature relative to freezing
  const avgTemp = hourly.reduce((s, h) => s + h.temp, 0) / hourly.length;
  if (avgTemp <= 1) { value += 15; reasonsFor.push('Temperatura favorable para nieve'); }
  else if (avgTemp <= 3) { value += 5; }
  else { value -= 15; reasonsAgainst.push('Temperatura alta para nieve'); }

  // Freezing level
  const avgFreezing = hourly.reduce((s, h) => s + h.freezingLevel, 0) / hourly.length;
  if (avgFreezing <= altitude + 150) { value += 10; reasonsFor.push('Cota favorable'); }
  else { value -= 10; reasonsAgainst.push('Cota alta'); }

  // Wind penalty
  const maxWind = Math.max(...hourly.map(h => h.wind));
  if (maxWind > 45) { value -= 10; reasonsAgainst.push('Viento muy fuerte (>45km/h)'); }
  else if (maxWind > 30) { value -= 5; reasonsAgainst.push('Viento moderado-fuerte'); }

  // Clamp
  value = Math.max(0, Math.min(100, value));

  const label = value >= 65 ? 'Alta' : value >= 35 ? 'Media' : 'Baja';
  return { value, label, reasonsFor, reasonsAgainst };
}
```

## UI Component Layout (mobile-first, `/pronostico`)

```
┌─────────────────────────────────┐
│ GuruSummary.astro (existing)     │  ← governed narrative
├─────────────────────────────────┤
│ ConfidenceBadge.astro (NEW)      │  ← "Confianza Media · 63/100" + tooltip
├─────────────────────────────────┤
│ SignalSummary.astro (NEW)        │  ← "¿Por qué dice esto?" collapsible
│  Temp: -2°C │ Precip: 1.2mm    │
│  Nieve: 3cm │ Cota: 1800m      │
│  Viento: 25km/h │ Hum: 72%     │
│  Fuentes: Open-Meteo ✓, AIC ✗  │
├─────────────────────────────────┤
│ SnowWindow.astro (existing)      │  ← validated window
├─────────────────────────────────┤
│ PowderScore.astro (existing)     │
├─────────────────────────────────┤
│ DegradedBanner.astro (NEW)       │  ← "Lectura parcial: falta AIC"
│ (only if degraded)               │
└─────────────────────────────────┘
```

In mobile, SignalSummary is collapsed by default (tappable "¿Por qué dice esto?"). ConfidenceBadge sits inline next to the Guru avatar. DegradedBanner goes between the GuruSummary and the period tabs.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `calculateConfidence()` | Known inputs → expected label + value range; edge cases (no data, all sources fail) |
| Unit | `validateWindow()` | Zero-duration, past, null, malformed, valid midnight-crossing |
| Unit | Narrative tier rules | `computeNarrativeTier()` with various confidence/snow/wind combos |
| Unit | Post-processor filter | LLM output with blocked phrases → falls back; clean output → passes |
| Integration | WeatherSource returns SourceStatus | Mock fetch failures → verify degraded flags |
| Fixture | Window edge case | "2026-06-19T23:00" → "2026-06-19T23:00" (zero duration) MUST be rejected |
| Build | Astro build | Verify new components compile and pages render without runtime errors |
| Visual | Mobile render | Screenshot test / manual check that layout doesn't overflow on 375px viewport |

## Open Questions

- [ ] SignalSummary.astro: collapsed accordion or always-visible compact table on desktop?
- [ ] ConfidenceBadge tooltip: native title attribute or a small popover component?
- [ ] DegradedBanner position: between GuruSummary and period selector, or below all content?
- [ ] Should `calculateConfidence()` read from the normalized weather directly or from the already-computed `SnowInterpretation`?
