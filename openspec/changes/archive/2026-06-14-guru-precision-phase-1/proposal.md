# Proposal: Guru Precision — Phase 1

## Intent

Make the Gurú measurably more accurate and competitive with snow-forecast.com by activating unused weather data and adding 3 new Open-Meteo variables. Quick wins only — no new APIs or external dependencies.

## Scope

### In Scope
- Add `snow_depth`, `weather_code`, `precipitation_probability` to Open-Meteo fetch
- Normalize + pipe new fields through the weather pipeline
- Pipe wind_direction, cloud_cover, wind_gusts into scoring engine
- Display snow depth per zone in index.astro and lab.astro
- Drive Gurú certainty from precipitation_probability (replacing heuristic snowChance)
- Feed new context fields into Gemini prompt

### Out of Scope
- Multi-model averaging (GFS/ECMWF/ICON)
- Open-Meteo Daily API aggregations
- Soil temperature or surface-level ground data
- Any new external API or paid service

## Capabilities

### New Capabilities
- `weather-data-enrichment`: Open-Meteo variables for snow depth, weather code, and precipitation probability — fetch shape, response types, and data contract

### Modified Capabilities
- `weather-normalization`: MUST pass through new fields (snow_depth, weather_code, precipitation_probability) in normalized output
- `snow-prediction-engine`: MUST incorporate wind_direction, cloud_cover, wind_gusts into zone analysis and powder scoring
- `guru-narrative`: SHOULD receive enriched data (snow depth, precip probability, weather code) in Gemini prompt; MAY use precip_probability as certainty level
- `ui-components`: MUST display snow_depth per zone in index.astro and lab.astro

## Approach

1. Add `snow_depth`, `weather_code`, `precipitation_probability` to `buildOpenMeteoUrl()` hourly params and `OpenMeteoResponse` type
2. Extend `NormalizedHourlyForecast` / `NormalizedZoneForecast` with new fields
3. In `scoring.ts`: add wind_direction bonus (SW/W = +15), cloud_cover bonus (>60% = +10), wind_gusts penalty (>50 = −8)
4. In `snow-engine.ts`: replace `snowChance()` heuristic with `precipitation_probability`
5. Pass `snow_depth` to zone forecasts and render in zone cards
6. Add snow depth, precip probability, weather code to Gemini user prompt

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/weather/open-meteo-api.ts` | Modified | +3 query params, extended response type |
| `src/lib/weather/types.ts` | Modified | New fields in hourly + zone types |
| `src/lib/weather/normalize-weather.ts` | Modified | Pass through new fields |
| `src/lib/scoring.ts` | Modified | Wind dir, cloud cover, gusts influence score |
| `src/lib/snow-engine.ts` | Modified | Precip probability replaces heuristic |
| `src/lib/ai/guru-copy.ts` | Modified | Enriched Gemini prompt |
| `src/pages/index.astro` | Modified | Snow depth in zone cards |
| `src/pages/lab.astro` | Modified | Snow depth in zone cards |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| ERA5-Land snow_depth may overestimate | Med | Display as relative indicator, not absolute |
| Prompt degradation with too many fields | Low | Add fields incrementally, test output |
| Scoring changes shift baseline behavior | Low | Additive only — existing weights untouched |

## Rollback Plan

Each change is an independent revert — no cascade. API: remove 3 query params. Scoring: comment new weighting lines. UI: remove snow_depth render. Build passes at every step.

## Dependencies

None — all changes use already-integrated Open-Meteo API.

## Success Criteria

- [ ] `npm run build` passes with zero type errors
- [ ] Snow depth visible per zone in index.astro and lab.astro
- [ ] Scoring uses wind_direction, cloud_cover, wind_gusts
- [ ] precipitation_probability drives Gurú certainty level
- [ ] All 3 new variables flow API → normalize → pipeline without data loss
