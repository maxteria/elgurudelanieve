# Design: Guru Precision — Phase 1

## Technical Approach

Add 3 Open-Meteo query params + response fields (`snow_depth`, `weather_code`, `precipitation_probability`). Enrich both type layers (`weather/types.ts` Normalized* and `types.ts` HourlyForecast). Pipe through normalization → scoring → narrative → UI. All changes additive, zero new dependencies. `snowChance` derives from `precipitationProbability`; heuristic `snowChance()` kept as fallback.

## Architecture Decisions

### Decision 1: Type Extension — Enrich existing types

| Option | Tradeoff |
|--------|----------|
| **Enrich existing types** | All consumers get fields automatically, minimal diff |
| New dedicated interfaces | Cleaner separation, but duplicate field mapping and rename risk |

**Choice**: Add `snowDepth`, `weatherCode`, `precipitationProbability` to `NormalizedHourlyForecast` + `NormalizedZoneForecast`. Add `windDir`, `cloudCover`, `windGusts`, `snowDepth`, `precipitationProbability` to central `HourlyForecast`.

### Decision 2: `snowChance` — API field primary, heuristic fallback

| Option | Tradeoff |
|--------|----------|
| **Precip probability primary** | Uses real forecast data; falls back gracefully |
| Remove heuristic entirely | Breaks if API field missing or zero |

**Choice**: `makeZoneForecast()` uses `currentHour.precipitationProbability` for `snowChance`. `computeZoneHourly()` sets `snow_prob` from `h.precipitationProbability` instead of hardcoded 0. `snowChance()` function retained as fallback.

### Decision 3: Scoring — enrich `HourlyForecast` + `calculatePowderScore()`

| Option | Tradeoff |
|--------|----------|
| **New fields on HourlyForecast** | Existing signature unchanged; all scoring data in one feed |
| Separate scoring params | Type-safe but changes function contract |

**Choice**: Add `windDir`, `cloudCover`, `windGusts` to `HourlyForecast`. `computeZoneHourly()` maps these from `NormalizedHourlyForecast`. `calculatePowderScore()` reads them inline.

### Decision 4: Snow depth — convert m→cm in normalize step

| Option | Tradeoff |
|--------|----------|
| **Convert in normalize-weather.ts** | Single conversion point, all consumers get cm |
| Convert per component | Duplicated logic, risk of inconsistency |

**Choice**: Round `snowDepth` to 2 decimals (meters) in `NormalizedHourlyForecast`. UI converts to cm: `Math.round(h.snowDepth * 100)`. Display label "Nieve en pista: XXcm".

## Data Flow

```
Open-Meteo API
  │  snow_depth, weather_code, precipitation_probability
  ▼
open-meteo-api.ts        ← 3 new params in URL + response type
  │
  ▼
normalize-weather.ts     ← map to NormalizedHourlyForecast.{snowDepth,weatherCode,precipitationProbability}
  │
  ├──→ makeZoneForecast()  ← snowChance from precipitationProbability
  │     └──→ NormalizedZoneForecast
  │
  └──→ computeZoneHourly() ← maps windDir, cloudCover, windGusts, snowDepth, precipProb
        └──→ HourlyForecast[]
              │
              ├──→ calculatePowderScore()  ← windDir bonus, cloudCover bonus, windGusts penalty
              │
              └──→ ZoneInterpretation.current  ← snowChance from precipProbability
                    │
                    ▼
              GuruCopyInput ← enriched with snowDepth, precipitationProbability, weatherCode
                    │
                    ▼
              buildUserPrompt() → Gemini  ← zone lines include snow depth (cm)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/weather/types.ts` | Modify | Add `snowDepth`, `weatherCode`, `precipitationProbability` to `NormalizedHourlyForecast` + `NormalizedZoneForecast` |
| `src/lib/weather/open-meteo-api.ts` | Modify | Add 3 params to `hourly` array + 3 fields to `OpenMeteoResponse.hourly` type |
| `src/lib/weather/normalize-weather.ts` | Modify | Map new fields through normalization; replace `snowChance()` call with `precipitationProbability` |
| `src/lib/types.ts` | Modify | Add `windDir`, `cloudCover`, `windGusts`, `snowDepth`, `precipitationProbability`, `weatherCode` to `HourlyForecast`; add `snowDepth`, `precipitationProbability`, `weatherCode` to `ZoneInterpretation.current` |
| `src/lib/scoring.ts` | Modify | Add wind dir bonus (180–315° → +15), cloud cover (>60 → +10), wind gusts (>50 → −8) |
| `src/lib/snow-engine.ts` | Modify | `computeZoneHourly()` passes through new fields; `snow_prob` maps from `precipitationProbability` |
| `src/lib/ai/guru-copy.ts` | Modify | Add `snowDepth`, `precipitationProbability`, `weatherCode` to `GuruCopyInput`; enrich `buildUserPrompt()` with snow depth (cm) per zone + WMO code context |
| `src/components/ZoneCard.astro` | Modify | Add snow depth display row ("Nieve en pista: XXcm") with zero-state and hidden-if-undefined |
| `src/pages/index.astro` | Modify | Snow depth appears via ZoneCard (if ZoneCard used) or inline zone display |
| `src/pages/lab.astro` | Modify | Snow depth appears in zone cards; `buildZoneHourly()` passes `snow_prob` from `precipitationProbability` |
| `src/lib/weather/constants.ts` | None | `snowChance()` kept as fallback — no change needed |

## Interfaces / Contracts

### Extended `HourlyForecast` (central types)

```typescript
export interface HourlyForecast {
  hour: number;
  temp: number;
  feels_like: number;
  wind: number;
  windDir: number;       // NEW
  cloudCover: number;    // NEW
  windGusts: number;     // NEW
  precip: number;
  snow_prob: number;
  freezing_level: number;
  humidity: number;
  snowfall: number;
  snowDepth: number;             // NEW (meters, 2 decimals)
  weatherCode: number;           // NEW (WMO 0–99)
  precipitationProbability: number; // NEW (0–100)
}
```

### Extended `NormalizedHourlyForecast`

```typescript
export type NormalizedHourlyForecast = {
  // ... existing fields ...
  snowDepth: number;              // meters, rounded 2 dec
  weatherCode: number;            // WMO code
  precipitationProbability: number; // 0–100
};
```

### Extended `ZoneInterpretation.current`

```typescript
current: {
  // ... existing fields ...
  snowDepth: number;              // meters
  precipitationProbability: number;
  weatherCode: number;
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Type check | All new fields flow without type errors | `npx astro check` or `npx tsc --noEmit` |
| Build | Pipeline compiles and renders | `npm run build` |
| Scoring | Wind/cloud/gust rules apply correctly | Manual review via lab.astro display |
| UI | Snow depth display, zero-state, missing-field | Visual check on index.astro + lab.astro |

## Migration / Rollout

No migration required. All changes are additive — existing code paths unchanged. Build passes at every step. Each change is independently revertible by removing the new lines.

## Open Questions

- [ ] Confirm: `snowChance()` heuristic fallback should trigger when `precipitationProbability` is 0, undefined, or both?
- [ ] Confirm: WMO code mapping in system prompt — should we include a short mapping list or just pass the raw code?
