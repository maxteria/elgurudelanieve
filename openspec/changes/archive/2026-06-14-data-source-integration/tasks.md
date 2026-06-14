# Tasks: Data Source Integration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~380-450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR (size-exception pre-approved) |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

## Phase 1: Types & Infrastructure

- [x] 1.1 Add `AicStationData`, `OpenMeteoCurrentWeather`, `OpenMeteoDaily` types to `src/lib/weather/types.ts`
- [x] 1.2 Extend `NormalizedSnowForecast` with `yesterday?`, `currentWeather?`, `daily?`
- [x] 1.3 Add `nextDays: DailySummary[]` to `GuruCopyInput` in `src/lib/ai/guru-copy.ts`
- [x] 1.4 Update `CAVIAHUE_COORDS` to -37.86/-71.08 in `open-meteo-api.ts` (or `constants.ts`)

## Phase 2: Data Sources

- [x] 2.1 Create `src/lib/weather/sources/aic-scraper.ts` — fetch AIC HTML, regex-parse table, return `AicStationData | null`
- [x] 2.2 Modify `open-meteo-api.ts` — add `current_weather=true` + `daily=` params to URL; extend `OpenMeteoResponse`
- [x] 2.3 Modify `normalize-weather.ts` — pass through `currentWeather` and `daily` into `NormalizedSnowForecast`
- [x] 2.4 Modify `weather-source.ts` — parallel AIC fetch, merge `yesterday`/`currentWeather`/`daily` into result

## Phase 3: Pipeline Consumers

- [x] 3.1 Modify `NowCard.astro` — accept `currentWeather` prop; OM primary for temp/wind/WMO; WA decorative only for icon/condition
- [x] 3.2 Modify `index.astro` — inline NOW reads `currentWeather` as primary, falls back to WA for feelsLike/humidity
- [x] 3.3 Modify `lab.astro` — pass `normalized.currentWeather` to NowCard alongside `weatherApi`
- [x] 3.4 Modify `guru-copy.ts` — multi-period fallback: when status=no but window in nextDays, generate "Hoy no, pero..." messages

## Phase 4: Test & Verify

- [x] 4.1 Update `demo-scenarios.ts` — add `yesterday?`, `currentWeather?`, `daily?` to all demo objects
- [x] 4.2 Update `guru-npc.test.ts` — add `nextDays: []` to existing test inputs; add test for multi-period fallback
- [x] 4.3 Create test for `aic-scraper.ts` — mock HTML, verify fields; test null on malformed HTML
- [x] 4.4 Run `npm run build` — confirm zero type errors

## Phase 5: CI/CD

- [x] 5.1 Create `.github/workflows/rebuild.yml` — cron `*/30 * * * *`, prettier --check, curl VERCEL_DEPLOY_HOOK_URL
