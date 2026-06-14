# Design: Lab Pro Dashboard

## Technical Approach

Enrich 5 files in-place to expose all pipeline data already flowing through `NormalizedSnowForecast`. No new data sources, no new components — just wiring existing fields through `buildZoneHourly()`, extending SVG chart renderers, adding table rows, and fixing one import path.

## Architecture Decisions

### Decision: Zone-hourly pass-through — explicit mapping, not spread

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Spread `...h` + overrides | Auto-carry new fields, but field names differ (`precipitation`→`precip`, `precipitationProbability`→`snow_prob`) | **Explicit**. Current code already renames 2 fields + corrects temp per zone. Spread would create silent breaks |
| Explicit add missing fields | More boilerplate but zero ambiguity about what maps where | ✅ Chosen — mirrors `computeZoneHourly()` in `snow-engine.ts` |

### Decision: Chart mixed scales — dedicated Y mappers, not unified axis

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Single unified axis for all vars | Forces unnatural scaling (wind 0-60 vs temp -6 to 4) | ❌ Rejected |
| Separate Y-mapping per variable (like existing `yt`/`yf`) | Keeps each variable readable within its own scale, SVG stays simple | ✅ Chosen. Precipitation scaled to bottom 30% of chart. Cloud cover = opacity dots. Wind arrows = rotation only. Daily: wind on left axis, humidity on new right axis |

### Decision: Wind direction from `currentWeather.winddirection`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| From `currentWeather.winddirection` | Already loaded, zero-extra-fetch | ✅ Chosen. Already typed as `OpenMeteoCurrentWeather.winddirection` |
| From normalized hourly data | More complex (hourly series vs current observation) | ❌ Rejected — current_weather is the correct source for "now" |

### Decision: AIC history — inline section, not separate component

| Option | Tradeoff | Decision |
|--------|----------|----------|
| New `AicHistory.astro` component | Cleaner separation but adds a file for ~30 lines | ❌ Rejected — keeps scope contained |
| Inline in `lab.astro` | No new file, data already in scope | ✅ Chosen. Use ternary + table fragment below forecast area |

## Data Flow

```
Open-Meteo API
    ↓ fetchOpenMeteo()
OpenMeteoResponse (hourly[15 fields] + current_weather + daily)
    ↓ normalizeOpenMeteoResponse()
NormalizedSnowForecast
  ├── hourly: NormalizedHourlyForecast[]  (ALL fields preserved)
  ├── zones: NormalizedZoneForecast       (ALL fields)
  ├── currentWeather: OpenMeteoCurrentWeather (winddirection)
  └── aicHistory: AicStationData[]
    ↓
lab.astro SSR
  ├── buildZoneHourly() → HourlyForecast[] (now 16 fields)
  ├── analyzeAllPeriods() → zoneInterpretations[].current (all fields)
  └── normalized.aicHistory → template
    ↓
Components
  ├── ForecastChart ← zoneHourlyToday/Tomorrow + dailySummaries
  │   ├── Hourly SVG: temp + freezing + precip bars + cloud dots + wind arrows
  │   └── Daily SVG: temp bars + snow rects + wind line + humidity line
  ├── ZoneCard ← zoneInterpretation
  │   └── Adds: freezingLevel, humidity, precipitationProbability rows
  ├── NowCard ← currentWeather + weatherApi
  │   └── Wind row: km/h + compass arrow (from winddirection)
  └── AIC section (inline)
      └── Table: date, precip, humidity, tmin, tmax, wind, dir
```

## Component Specifications

### ForecastChart — Hourly SVG additions

- **Precipitation bars**: Bottom 30% of chart (`ph * 0.3`). `rect` per hour, width=`pw/(n-1)*0.6`, height=`min(precip/10 * ph*0.3, ph*0.3)`, fill=`rgba(168,231,249,0.2)`. Y-positioned from bottom.
- **Cloud cover dots**: `circle` radius 2, cx at hour x, cy near bottom (`ch - padB - 15`), opacity=`cloudCover/100`, fill=`rgba(255,255,255,0.4)`.
- **Wind arrows**: `<path d="M0,-4 L3,0 L-3,0 Z"/>` rotated by `windDir` degrees via `transform="rotate(windDir, cx, cy)"`. Positioned above time labels.
- **Legend**: Add "Precipitación" bar + "Viento" arrow + "Nubosidad" dot.

### ForecastChart — Daily SVG additions

- **Wind line**: `polyline` through `avgWind` mapped to `yt(wind)` with `stroke="rgba(255,255,255,0.3)"` stroke-width 1. Small `maxWindGust` cross markers (`+` shape) per day.
- **Humidity axis**: Right-axis labels at 0%, 50%, 100%. `yh(humidity)` = `padT + ph - (humidity/100) * ph`. Thin line `stroke="rgba(168,231,249,0.15)"`.
- **Freezing level min band**: Light orange rect/between `minFreezingLevel` and `maxFreezingLevel` of day, mapped to right axis.

### ZoneCard — new rows

Inserted between existing rows in this order:
1. wind (existing)
2. **freezingLevel** (new) — "Cota de nieve" / `freezingLevel > 3000 ? '>3000 m' : `${freezingLevel} m``
3. precipitation (existing)
4. **precipitationProbability** (new) — "Prob. precipitación" / `N%`
5. snowChance (existing)
6. **humidity** (new) — "Humedad" / `N%`
7. snowDepth (existing) — **add `data-period-zone-snowdepth` attribute**

All three new rows use conditional render: omit row if `null/undefined`.

### NowCard — wind direction

- Import: already has `currentWeather` typed as `OpenMeteoCurrentWeather` with `winddirection`
- Compass resolver: `const DIRS = ['N','NE','E','SE','S','SW','W','NW']`; index = `Math.round(winddirection / 45) % 8`
- SVG arrow: `<path d="M4,0 L2,4 L3,4 L3,8 L5,8 L5,4 L6,4 Z" fill="currentColor"/>` rotated by `winddirection` via `transform="rotate(winddirection, 4, 4)"`
- Render inside wind row alongside km/h text. Hide arrow + compass text when `winddirection` is null.

### setActivePeriod() JS

Add inside zone card update loop:
```js
var snowDepthEl = card.querySelector('[data-period-zone-snowdepth]');
if (snowDepthEl && z.current.snowDepth !== undefined) {
  var sd = Math.round(z.current.snowDepth * 100);
  snowDepthEl.textContent = sd === 0 ? 'Sin nieve acumulada' : sd + ' cm';
  snowDepthEl.parentElement.style.display = '';
} else if (snowDepthEl) {
  snowDepthEl.parentElement.style.display = 'none';
}
```

### AIC history section

Inline in lab.astro after the ForecastChart block. Scrollable container (`max-h-64 overflow-y-auto`). Table with these columns: Fecha, Precip., Humedad, T. mín, T. máx, Viento, Dir. Null values → "--". Empty array → `<p class="text-white/30 text-[10px]">Sin datos históricos</p>`.

### GuruTouristCopy import

Line 2: `'./ai/types'` → `'../../lib/ai/types'` — matches `GuruNpcCard.astro` pattern.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/ForecastChart.astro` | Modify | Add precip bars, cloud dots, wind arrows to hourly; wind + humidity lines to daily; update legend |
| `src/components/ZoneCard.astro` | Modify | Add 3 rows (freezingLevel, humidity, precipProb) + data-period-zone-snowdepth attr |
| `src/components/NowCard.astro` | Modify | Add wind direction arrow + compass text from currentWeather.winddirection |
| `src/pages/lab.astro` | Modify | buildZoneHourly() pass-through (7 new fields), AIC section HTML, setActivePeriod() snowDepth update |
| `src/components/GuruTouristCopy.astro` | Modify | Fix import path `'./ai/types'` → `'../../lib/ai/types'` |

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Build | TS + Astro compilation | `npm run build` — must pass 0 errors |
| Visual | Chart renders all 5 variable types | Manual: inspect SVG output in browser |
| Visual | ZoneCard shows 3 new rows | Manual: freezingLevel, humidity, precipProb visible |
| Visual | NowCard wind arrow rotates | Manual: check `transform` matches winddirection |
| Functional | Period switch updates snowDepth | Manual: click "Mañana" → snowDepth row updates |
| Functional | AIC empty state | Manual: if no history, shows "Sin datos históricos" |
| Edge | null/undefined fields in ZoneCard | Rows omitted, no "--" shown |
| Edge | Missing winddirection | Arrow hidden, km/h shown solo |

## Migration / Rollout

No migration required. All changes are UI-only. Data pipeline unchanged.
