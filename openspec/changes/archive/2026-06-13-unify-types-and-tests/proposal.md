# Proposal: Unify Types and Tests

## Intent

The project has a dual type system (`WeatherData` ↔ `NormalizedSnowForecast`) with a bridge (`convert-to-legacy.ts`) that duplicates lapse-rate math, windChill, and snowProbability from `normalize-weather.ts`. The engine (`snow-engine.ts`) consumes only legacy types, losing fields like snowfall cm, windGusts, windDir, and cloudCover. Meanwhile the brain of the prediction has zero tests — `scoring.ts` has 6 tests but the main engine doesn't.

Unify to `NormalizedSnowForecast` as the single engine input, eliminate the duplicate helpers, and write tests before refactoring.

## Scope

### In Scope
1. Tests for `snow-engine.ts` (analyzeWeather, computeSnowLabel, generateSummary, zone alerts)
2. Refactor engine to consume `NormalizedSnowForecast` directly (kill `convert-to-legacy.ts`)
3. Remove duplicate code (LAPSE_RATE, windChill, snowProbability)
4. Keep `SnowInterpretation` as the stable UI output contract

### Out of Scope
- UI changes or new components
- Gurú NPC vision (deferred)
- New weather data sources
- API improvements (timeout, retry)

## Capabilities

> Pure refactor + tests — no spec-level behavioral change.

### New Capabilities
None

### Modified Capabilities
None

## Approach

Phased:
1. **Test first** — write tests for `snow-engine.ts` covering current WeatherData→SnowInterpretation path
2. Create unified engine-internal types (subset of normalized + output fields)
3. Refactor `snow-engine.ts` to accept `NormalizedSnowForecast` instead of `WeatherData`
4. Refactor `period-engine.ts` accordingly (remove `normalizedToLegacy` call)
5. Delete `convert-to-legacy.ts` and shared duplicate helpers
6. Update remaining callers (`weather-source.ts` demo path, demo-scenarios)
7. Verify all tests + `npm run build` pass

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/snow-engine.ts` | Modified | Accept NormalizedSnowForecast, remove legacy mapping |
| `src/lib/period-engine.ts` | Modified | Remove normalizedToLegacy bridge call |
| `src/lib/weather/convert-to-legacy.ts` | **Removed** | Entire file deleted |
| `src/lib/weather/normalize-weather.ts` | Modified | Extract shared helpers (windChill, snowChance) |
| `src/lib/weather/weather-source.ts` | Modified | Demo path's legacyToNormalized needs cleanup |
| `src/lib/__tests__/snow-engine.test.ts` | **New** | ~6-10 test cases |
| `src/lib/types.ts` | Modified | Remove engine-only fields from WeatherData |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Demo scenarios hardcode WeatherData shape | Medium | Convert demo path in weather-source.ts |
| legacyToNormalized invents data (windGusts, cloudCover) | Medium | Clean up synthetic fields |
| SnowInterpretation changes break components | Low | Keep it frozen — test the output contract |

## Rollback Plan

One commit per phase. If tests or build fail at any step, revert the last commit. All tests must pass before merge.

## Dependencies

- Vitest already installed — no new dependencies

## Success Criteria

- [ ] `snow-engine.ts` has ≥6 tests covering analyzeWeather, computeSnowLabel, generateSummary, generateZoneAlerts
- [ ] `convert-to-legacy.ts` deleted — no imports reference it
- [ ] Duplicate LAPSE_RATE, windChill, snowChance functions unified to one location
- [ ] `npm run build` passes with zero type errors
- [ ] All existing scoring tests still pass
