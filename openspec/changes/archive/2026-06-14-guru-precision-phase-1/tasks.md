# Tasks: Guru Precision — Phase 1

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200–260 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Types → API → normalize → scoring → snow engine → guru prompt → UI | Single PR | All additive, no cascade risk |

## Phase 1: Types & API

- [x] 1.1 Add `snowDepth`, `weatherCode`, `precipitationProbability` to `NormalizedHourlyForecast` + `NormalizedZoneForecast` in `src/lib/weather/types.ts`
- [x] 1.2 Add `windDir`, `cloudCover`, `windGusts`, `snowDepth`, `weatherCode`, `precipitationProbability` to `HourlyForecast` in `src/lib/types.ts`
- [x] 1.3 Add `snowDepth`, `precipitationProbability`, `weatherCode` to `ZoneInterpretation.current` in `src/lib/types.ts`
- [x] 1.4 Add `snow_depth`, `weather_code`, `precipitation_probability` to `buildOpenMeteoUrl()` params + `OpenMeteoResponse.hourly` type in `src/lib/weather/open-meteo-api.ts`

## Phase 2: Pipeline & Scoring

- [x] 2.1 Map 3 new fields in `normalizeOpenMeteoResponse()` in `src/lib/weather/normalize-weather.ts`; use `precipitationProbability` for `makeZoneForecast` `snowChance`
- [x] 2.2 Add wind dir bonus (180–315° → +15), cloud cover (>60 → +10), wind gusts (>50 → −8) to `calculatePowderScore()` in `src/lib/scoring.ts`
- [x] 2.3 Pass `windDir`, `cloudCover`, `windGusts`, `snowDepth` through `computeZoneHourly()`; set `snow_prob` from `precipitationProbability` in `src/lib/snow-engine.ts`

## Phase 3: Guru & UI

- [x] 3.1 Add `snowDepth`, `precipitationProbability`, `weatherCode` to `GuruCopyInput`; enrich `buildUserPrompt()` with snow depth (cm) + WMO code in `src/lib/ai/guru-copy.ts`
- [x] 3.2 Add snow depth row ("Nieve en pista: XXcm") to `src/components/ZoneCard.astro` with zero-state and hidden-if-undefined
- [x] 3.3 Update `buildZoneHourly()` in `src/pages/lab.astro` to pass `snow_prob` from `precipitationProbability`

## Phase 4: Verify

- [x] 4.1 Run `npx astro check` — zero type errors across all changed files
- [x] 4.2 Run `npm run build` — no build errors
