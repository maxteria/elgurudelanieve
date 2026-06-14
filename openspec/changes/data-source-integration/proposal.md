# Proposal: Data Source Integration

## Intent

Give the Gurú real measured station data instead of relying solely on forecasts. Unlocks "ayer vs hoy" narratives and multi-period window awareness in fallback messages. Right now the Guru has no visibility into actual conditions or upcoming snow windows — this changes that.

## Scope

### In Scope
- AIC Caviahue station scraping (yesterday's daily measurements via HTML table)
- Open-Meteo `current_weather=true` endpoint as WeatherAPI fallback
- Open-Meteo daily API (snowfall_sum, precipitation_sum, temp_max/min, precipitation_probability_max)
- Pipe AIC yesterday data into NormalizedSnowForecast for Guru consumption
- Refactor NowCard to show combined source data
- Multi-period window communication in fallback messages
- GitHub Actions workflow + Vercel Deploy Hook for 2x daily rebuilds

### Out of Scope
- Meteoblue integration for extended probability (Phase 2)
- Multi-model averaging — GFS + ECMWF (Phase 2)
- Historical data visualization (Phase 2)
- AIC historical charts scraping (too fragile)
- Live/hot-reload data — SSG-only at build time

## Capabilities

### New Capabilities
- `aic-station-scraping`: Scrape AIC Caviahue HTML table for daily station measurements (yesterday's data). Graceful fallback — missing data never breaks the build.
- `scheduled-rebuilds`: GitHub Actions cron (08:00/20:00 ART) + Vercel Deploy Hook for automatic SSG rebuilds.

### Modified Capabilities
- `weather-data-enrichment`: Extend the data pipeline with `current_weather=true`, daily API parameters, and AIC yesterday data. New types for current_weather and daily responses. Normalized into existing `NormalizedSnowForecast`.

## Approach

Phase 1 — Core Pipeline:
1. **AIC scraper**: Parse `body_TabMediciones_TabMed0_grilla` table from AIC page with cheerio. Yesterday's data only. Graceful fallback (null) if unavailable.
2. **Open-Meteo enrichment**: Add `current_weather=true` and `daily=snowfall_sum,precipitation_sum,temperature_2m_max,temperature_2m_min,precipitation_probability_max` to `buildOpenMeteoUrl()`.
3. **Pipeline merge**: In `weather-source.ts`, combine AIC (yesterday) + Open-Meteo (current + daily forecast) + WeatherAPI (decorative). Align AIC coordinates (-37.86, -71.08) with project constants.
4. **NowCard refactor**: Primary data from Open-Meteo current_weather; WeatherAPI for icon/condition text only.
5. **Fallback messages**: Update to reference multi-period windows (e.g., "snow window Thu 18–Sun 21 con 2-4cm").
6. **Rebuild automation**: `.github/workflows/rebuild.yml` with two daily schedules, curl to Vercel Deploy Hook.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/weather/sources/open-meteo-api.ts` | Modified | Add current_weather + daily params |
| `src/lib/weather/sources/aic-scraper.ts` | New | AIC HTML scraping module |
| `src/lib/weather/weather-source.ts` | Modified | Combine AIC + Open-Meteo + WeatherAPI |
| `src/lib/weather/types.ts` | Modified | New AIC, current_weather, daily types |
| `src/components/NowCard.astro` | Modified | Combined source display |
| `.github/workflows/rebuild.yml` | New | Cron-driven rebuild |
| `src/lib/ai/guru-copy.ts` | Modified | Multi-period fallback messages |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| AIC site HTML changes | Low | Graceful error — build proceeds without it |
| AIC site down | Low | Optional data source, never blocks build |
| Vercel build budget exceeded | Low | Max 2 deploys/day + manual trigger |
| WeatherAPI key missing | Med | Open-Meteo current_weather as primary fallback |
| Coord mismatch (station vs town) | Low | Document difference, no functional impact |

## Rollback Plan

Remove AIC scraper import from `weather-source.ts`, revert Open-Meteo URL params to pre-change state, delete `rebuild.yml`. NowCard reverts to WeatherAPI-only display. One revert commit. No data migration needed.

## Dependencies

- Vercel Deploy Hook URL (configure as `VERCEL_DEPLOY_HOOK_URL` GitHub Actions secret)
- cheerio or regex parser for AIC HTML table

## Success Criteria

- [ ] AIC daily data populates `NormalizedSnowForecast.yesterday` during builds
- [ ] Open-Meteo current_weather feeds NowCard when WeatherAPI unavailable or lacking key
- [ ] daily API provides snowfall_sum, precipitation_sum, temp_max/min, precip_prob_max
- [ ] Fallback messages include multi-period window awareness ("weekend", "next 3 days")
- [ ] `npm run build` passes with zero type errors
- [ ] Site rebuilds automatically at 08:00 and 20:00 ART
