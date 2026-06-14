# Proposal: Lab Pro Dashboard

## Intent

Turn the LAB (`/lab`) from a basic weather readout into a full pro dashboard showing ALL enriched pipeline data — wind direction, cloud cover, humidity, freezing level, AIC history, and snow depth — across hourly, daily, and zone views.

## Scope

### In Scope
- Fix `buildZoneHourly()` to pass through all enriched fields (snowfall, windDir, windGusts, humidity, cloudCover, snowDepth, weatherCode)
- Enrich ForecastChart hourly view with wind barbs, precipitation bars, cloud cover dots
- Enrich ForecastChart daily view with wind, humidity, cloud cover, freezing level bands
- Add wind direction display to NowCard (from Open-Meteo `current_weather.winddirection`)
- Add freezingLevel, humidity, precipitationProbability rows to ZoneCard
- Fix `snowDepth` period switching — add `data-period-zone-snowdepth` attr + JS update
- Add AIC history section in LAB (small table, last 7 readings)
- Fix `GuruTouristCopy.astro` import path (`'./ai/types'` → `'../../lib/ai/types'`)

### Out of Scope
- Guru NPC card in LAB (stays on `/` only)
- Volcano monitoring data
- Interactive chart interactions (hover tooltips, zoom)
- Push notifications or real-time updates

## Capabilities

### New Capabilities
- `forecast-chart-enrichment`: Multi-variable SVG charts — wind, precipitation, cloud cover, freezing level overlaid on temp
- `aic-history-display`: AIC station history section (table of last 7 readings)

### Modified Capabilities
- `weather-data-enrichment`: Zone-hourly data pass-through for all enriched fields (currently drops 7 fields)
- `nowcard-refactor`: Add wind direction display to NowCard

## Approach

1. **buildZoneHourly()** — add missing fields to return object (mirror `HourlyForecast` shape from `snow-engine.ts`)
2. **ForecastChart** — extend `renderHourlyChart()`: precipitation as vertical bars below temp line, cloud cover as opacity gradient along x-axis, wind as small arrows/barbs. Extend `renderDailyChart()`: wind as line, humidity/cloud cover as secondary axis, freezing level range band
3. **NowCard** — resolve `winddirection` from `currentWeather` props, render as text + small SVG arrow rotated by degrees
4. **ZoneCard** — add 3 new data rows (freezingLevel, humidity, precip probability) + `data-period-zone-snowdepth` attribute on snowDepth row
5. **setActivePeriod()** — add `querySelector` for `[data-period-zone-snowdepth]` and update on period switch
6. **AIC history** — new `<AicHistory>` component or inline section in `lab.astro` receiving `normalized.aicHistory`, showing date/temp/precip/humidity/wind per row
7. **GuruTouristCopy.astro** — one-line import path fix

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/pages/lab.astro` | Modified | buildZoneHourly() pass-through, AIC section HTML, period JS update |
| `src/components/ForecastChart.astro` | Modified | Hourly + daily chart enrichment |
| `src/components/ZoneCard.astro` | Modified | New data rows + data attr |
| `src/components/NowCard.astro` | Modified | Wind direction display |
| `src/components/GuruTouristCopy.astro` | Modified | Fix import path |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Chart SVG gets too dense | Medium | Cap display at 8 hourly slots, wrap lines that overflow |
| AIC data empty array shows broken UI | Low | Guard: render "Sin datos históricos" when empty |
| Period JS snowDepth update misses attr | Low | Add `data-period-zone-snowdepth` to both SSR + JS selector |

## Rollback Plan

- Revert `src/pages/lab.astro` to remove AIC section and restore `buildZoneHourly()`
- Revert ForecastChart, ZoneCard, NowCard, GuruTouristCopy to commit before change
- No data loss — all changes are UI-only

## Dependencies

- All enriched fields already flow through data pipeline (Open-Meteo → normalize → lab.astro)
- AIC history already fetched and present in `normalized.aicHistory`
- No new API keys or services

## Success Criteria

- [ ] `npm run build` passes with 0 TS errors
- [ ] ForecastChart shows wind + precipitation + cloud cover + freezing level for both hourly and daily
- [ ] NowCard shows wind direction as compass arrow
- [ ] ZoneCard shows freezingLevel, humidity, precipProbability
- [ ] Period switching updates snowDepth dynamically
- [ ] AIC history table renders with data (or "Sin datos" fallback)
- [ ] GuruTouristCopy.astro import resolves correctly
