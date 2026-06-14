# Tasks: Unify Types and Tests

## Review Workload Forecast

| Field                   | Value       |
| ----------------------- | ----------- |
| Estimated changed lines | ~350-450    |
| 400-line budget risk    | Medium      |
| Chained PRs recommended | No          |
| Suggested split         | Single PR   |
| Delivery strategy       | ask-on-risk |
| Chain strategy          | pending     |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal                                    | Likely PR | Notes                           |
| ---- | --------------------------------------- | --------- | ------------------------------- |
| 1    | Tests + refactor engine + remove legacy | PR 1      | Single PR under 800-line budget |

## Phase 1: Test snow-engine.ts (safety net)

- [x] 1.1 Create `src/lib/__tests__/snow-engine.test.ts` with test helpers (makeHour, makeWeatherData)
- [x] 1.2 Test `analyzeWeather` — dry forecast returns `status: 'no'`, `snowLabel: 'sin nieve'`
- [x] 1.3 Test `analyzeWeather` — moderate snow returns correct `snowLabel` and `zones`
- [x] 1.4 Test `analyzeWeather` — heavy snow with wind window returns `'se viene un paquetón'`
- [x] 1.5 Test `computeSnowLabel` — boundary values (score 20, 35, 55, 78, window flag)
- [x] 1.6 Test `generateZoneAlerts` — wind danger (wind > 40), wind warning (wind > 30), rain alert
- [x] 1.7 Test `generateSummary` — dry cold, snowy with window, windy edge cases
- [x] 1.8 Test `generateSummary` — fallback rules when no content rules match

## Phase 2: Create unified engine input type

- [x] 2.1 Add `humidity` field to `NormalizedZoneForecast` in `src/lib/weather/types.ts`
- [x] 2.2 Populate `humidity` in `normalize-weather.ts` `makeZoneForecast` from current hour
- [x] 2.3 Define `EngineInput` type alias (or confirm `NormalizedSnowForecast` with zones + hourly suffices)

## Phase 3: Refactor snow-engine.ts to NormalizedSnowForecast

- [x] 3.1 Change `analyzeWeather` signature from `WeatherData` to `NormalizedSnowForecast`
- [x] 3.2 Update imports: remove `WeatherData`, add `NormalizedSnowForecast`, `NormalizedHourlyForecast`
- [x] 3.3 Rewrite zone iteration: read `normalized.zones.{village,mid,top}` + `normalized.hourly` instead of `data.zones[]`
- [x] 3.4 Update `getZoneAnswer` to accept `NormalizedHourlyForecast[]`, derive hour from `h.time`
- [x] 3.5 Map `NormalizedZoneForecast` fields to `ZoneInterpretation.current` (camelCase to camelCase)
- [x] 3.6 Update `generateZoneAlerts` to use `normalized.hourly` filtered by zone altitude
- [x] 3.7 Remove `updated: data.updated` — read `normalized.updatedAt` instead

## Phase 4: Refactor period-engine.ts and weather-source.ts

- [x] 4.1 In `period-engine.ts`, remove `normalizedToLegacy` import and call — pass `periodNorm` directly to `analyzeWeather`
- [x] 4.2 In `weather-source.ts`, remove `legacyToNormalized` reverse bridge function (lines 131-182)
- [x] 4.3 Update `weather-source.ts` demo path to return normalized data directly (skip WeatherData)
- [x] 4.4 Update `weather-source.ts` `WeatherResult.data` to be optional or remove if unused

## Phase 5: Remove convert-to-legacy.ts + deduplicate helpers

- [x] 5.1 Extract shared constants: move `LAPSE_RATE` to `src/lib/weather/constants.ts`
- [x] 5.2 Extract shared `windChill` to `src/lib/weather/constants.ts` (both copies are identical)
- [x] 5.3 Extract shared `snowChance`/`snowProbability` to `src/lib/weather/constants.ts` (identical logic)
- [x] 5.4 Update `normalize-weather.ts` to import shared helpers from `constants.ts`
- [x] 5.5 Delete `src/lib/weather/convert-to-legacy.ts` entirely
- [x] 5.6 Run `rg "convert-to-legacy"` to confirm zero remaining imports

## Phase 6: Update demo scenarios

- [x] 6.1 Refactor `src/data/demo-scenarios.ts` to produce `NormalizedSnowForecast` instead of `WeatherData`
- [x] 6.2 Update `getDemoScenarioData` return type and all internal helpers
- [x] 6.3 Update `weather-source.ts` demo path to use new normalized-only scenario data

## Phase 7: Verification

- [x] 7.1 Run `npx vitest run` — all existing scoring tests AND new snow-engine tests pass
- [x] 7.2 Run `npm run build` — zero type errors, no missing imports
