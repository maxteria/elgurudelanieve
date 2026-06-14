# Design: Data Source Integration

## Technical Approach

Option B (Full): augment the SSG build pipeline with three new data sources (AIC station yesterday, Open-Meteo current_weather, Open-Meteo daily API), refactor NowCard to combine sources, add multi-period window awareness to fallback messages, and automate rebuilds. Every new source is optional — build never fails on missing data.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| AIC parser | cheerio, regex, jsdom | cheerio needs install, jsdom heavy, regex zero-deps | **regex** — ASP.NET table is simple and stable |
| Coordinates | update to AIC coords vs document diff | station vs town ~2.5km apart | **update CAVIAHUE_COORDS** to -37.86/-71.08 + document rationale |
| NowCard source | OM current_weather vs keep WA primary | OM has temp/wind/WMO but no feelsLike/icon | **OM primary** for temp/wind/weatherCode; WA decorative for icon+condition text only |
| Rebuild cadence | `*/30 * * * *` vs 2x/day | 48 deploys/day risks Vercel budget | **`*/30 * * * *`** per prompt; flag for team review |
| Multi-period input | DailySummary[] vs raw daily | raw gives exact snowfall_sum per day | **DailySummary[]** — reuses existing type in guru-copy |

## Data Flow

```
Build Start
  │
  ├── AIC Page ──→ aic-scraper.ts ──→ AicStationData | null  (yesterday)
  │
  ├── Open-Meteo API ──→ open-meteo-api.ts ──→ current_weather + daily + hourly
  │
  ├── WeatherAPI ──→ weather-api.ts ──→ icon + condition text only
  │
  └── normalize-weather.ts ──→ NormalizedSnowForecast {
                                  yesterday?: AicStationData,
                                  currentWeather?: OpenMeteoCurrentWeather,
                                  daily?: OpenMeteoDaily
                                }
                                      │
                              weather-source.ts merges: AIC + OM + WA
                                      │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
              index.astro         lab.astro          guru-copy.ts
           (inline NOW)        (NowCard + lab)   (nextDays for fallback)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/weather/sources/aic-scraper.ts` | Create | Fetch AIC page, parse `<table>` with regex, return `AicStationData \| null` |
| `.github/workflows/rebuild.yml` | Create | Cron `*/30 * * * *` + workflow_dispatch; prettier check; curl VERCEL_DEPLOY_HOOK_URL |
| `src/lib/weather/types.ts` | Modify | Add `AicStationData`, `OpenMeteoCurrentWeather`, `OpenMeteoDaily` types. Extend `NormalizedSnowForecast` with `yesterday?`, `currentWeather?`, `daily?` |
| `src/lib/weather/open-meteo-api.ts` | Modify | Add `current_weather=true` and `daily=` params. Update `CAVIAHUE_COORDS` to (-37.86, -71.08). Add `OpenMeteoCurrentWeather` + `OpenMeteoDailyResponse` to `OpenMeteoResponse` |
| `src/lib/weather/normalize-weather.ts` | Modify | Pass through `currentWeather` and `daily` from raw response into `NormalizedSnowForecast` |
| `src/lib/weather/weather-source.ts` | Modify | Parallel AIC fetch alongside Open-Meteo + WeatherAPI. Merge `yesterday`, `currentWeather`, `daily` into result |
| `src/data/demo-scenarios.ts` | Modify | Add optional `yesterday?`, `currentWeather?`, `daily?` fields to demo scenario objects |
| `src/components/NowCard.astro` | Modify | Accept `currentWeather` prop + optional `weatherApi`. Primary data from OM; WA used only for icon/condition if available |
| `src/pages/index.astro` | Modify | Inline NOW section reads `normalized.currentWeather` as primary, falls back to `weatherApi` for feelsLike/humidity/cloudCover |
| `src/pages/lab.astro` | Modify | Pass `normalized.currentWeather` to NowCard alongside `weatherApi` |
| `src/lib/ai/guru-copy.ts` | Modify | Add `nextDays: DailySummary[]` to `GuruCopyInput`. Multi-period fallback: when `status==='no'` but window exists in `nextDays`, generate "Hoy no, pero el jueves..." messages |
| `src/lib/__tests__/guru-npc.test.ts` | Modify | Add `nextDays: []` to test `makeInput()` calls. Add test cases for multi-period fallback |

## Interfaces / Contracts

```typescript
// New types in types.ts
export type AicStationData = {
  stationName: string;
  date: string;  // ISO date of yesterday
  humidity: number | null;
  precipitation: number | null;
  pressure: number | null;
  tempMin: number | null;
  tempMax: number | null;
  windDir: number | null;
  windSpeed: number | null;
  windMax: number | null;
  snowWaterEq: number | null;
  updatedAt: string;
};

export type OpenMeteoCurrentWeather = {
  time: string;
  temperature: number;
  windspeed: number;
  winddirection: number;
  isDay: number;
  weathercode: number;
};

export type OpenMeteoDaily = {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  snowfall_sum: number[];
  precipitation_probability_max: number[];
};

// Extended NormalizedSnowForecast
export type NormalizedSnowForecast = {
  // ...existing fields
  yesterday?: AicStationData;
  currentWeather?: OpenMeteoCurrentWeather;
  daily?: OpenMeteoDaily;
};
```

```typescript
// Extended GuruCopyInput in guru-copy.ts
export type GuruCopyInput = {
  // ...existing fields
  nextDays?: DailySummary[];  // NEW: for multi-period lookups
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | AIC scraper parsing | Mock HTML, verify `AicStationData` fields match expected values. Test null on malformed HTML |
| Unit | Fallback multi-period | Add test cases: status=no + window in 3 days → message mentions window; status=no + window >3 days → lower urgency |
| Unit | Type correctness | `npm run build` must pass with zero type errors after all type additions |
| Unit | Existing fallback preservation | All existing `generateFallbackNpcMessage` tests must pass with `nextDays: []` added to inputs |

## Migration / Rollout

No data migration required. All new fields are optional (\`?\`). Existing pages continue working without them. Rollback: revert changes, one commit.

## Open Questions

- [ ] **Rebuild cadence**: Spec says 2x/day (08:00/20:00 ART), prompt says `*/30 * * * *`. Every-30-minutes burns Vercel build budget (max ~300/mo on Hobby). Needs team decision.
- [ ] **Prettier CI step**: No prettier config found — `npx prettier --check .` needs a `.prettierrc` to avoid linting node_modules. Add minimal config or scope to `src/`.
- [ ] **AIC URL stability**: Current URL `https://www.aic.gob.ar/sitio/estaciones-detalle?a=65` — confirm before implementation.
