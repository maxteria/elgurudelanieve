# Tasks: Lab Pro Dashboard

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~125 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

No chained PRs needed — well under 400-line budget. Single PR.

## Phase 1: Data Plumbing — lab.astro

- [x] 1.1 Add 8 missing fields to buildZoneHourly() return: windDir, cloudCover, windGusts, humidity, snowfall, snowDepth, weatherCode, precipitationProbability
- [x] 1.2 Add `data-period-zone-snowdepth` attribute to snowDepth `<span>` in rendered zone card loop
- [x] 1.3 Add snowDepth update block to setActivePeriod() JS: query `[data-period-zone-snowdepth]`, set textContent from z.current.snowDepth, hide row on undefined

## Phase 2: Chart Enrichment — ForecastChart.astro

- [x] 2.1 Add precip bars to hourly chart: `rect` per hour in bottom 30%, height ~ precip/10×ph×0.3, fill rgba(168,231,249,0.2)
- [x] 2.2 Add cloud cover dots to hourly chart: `circle` r=2 near bottom, opacity = cloudCover/100, fill rgba(255,255,255,0.4)
- [x] 2.3 Add wind arrows to hourly chart: `<path>` rotated by windDir degrees above time labels
- [x] 2.4 Add daily wind line: `polyline` through avgWind mapped to yt + maxWindGust cross markers
- [x] 2.5 Add daily humidity right-axis: labels at 0/50/100%, thin line mapping avgHumidity, stroke rgba(168,231,249,0.15)
- [x] 2.6 Add daily freezing level band: rect between minFreezingLevel/maxFreezingLevel with light orange fill
- [x] 2.7 Update legend: add Precipitación bar, Viento arrow, Nubosidad dot

## Phase 3: Component Enrichment — ZoneCard + NowCard

- [x] 3.1 Add freezingLevel row to ZoneCard: "Cota de nieve", format `>3000 m` or `N m`
- [x] 3.2 Add humidity row to ZoneCard: "Humedad", format `N%`
- [x] 3.3 Add precipitationProbability row to ZoneCard: "Prob. de precipitación", format `N%`
- [x] 3.4 Add wind direction to NowCard: compass text (N/NE/E/SE/S/SW/W/NW) + SVG arrow rotated by winddirection
- [x] 3.5 Handle null/undefined: omit ZoneCard rows entirely, hide NowCard arrow + compass when no winddirection

## Phase 4: AIC History — lab.astro

- [x] 4.1 Add AIC history section below ForecastChart: scrollable container (max-h-64 overflow-y-auto), table with Fecha/Precip/Humedad/T.min/T.máx/Viento/Dir
- [x] 4.2 Handle empty/null aicHistory: render "Sin datos históricos" text, null table values show "--"

## Phase 5: Fix + Verify

- [x] 5.1 Fix GuruTouristCopy.astro import: `'./ai/types'` → `'../../lib/ai/types'`
- [x] 5.2 Run `npm run build` — verify 0 TS errors
- [ ] 5.3 Visual check: hourly chart shows precip/cloud/wind, daily shows wind/humidity/freezing band
- [ ] 5.4 Functional check: period switching updates snowDepth, AIC renders data or fallback
