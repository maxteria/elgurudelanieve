# Weather Data Enrichment Specification

## Purpose

Defines the fetch shape, response types, and data contract for `snow_depth`, `weather_code`, and `precipitation_probability` variables from the Open-Meteo API.

## Requirements

### Requirement: API Fetch Shape

The system MUST include `snow_depth`, `weather_code`, `precipitation_probability`, `current_weather=true`, and `daily=snowfall_sum,precipitation_sum,temperature_2m_max,temperature_2m_min,precipitation_probability_max` in the API request.
(Previously: only hourly params snow_depth, weather_code, precipitation_probability)

#### Scenario: New params in URL

- GIVEN `buildOpenMeteoUrl()` is called with default options
- WHEN the URL is constructed
- THEN the `hourly` query parameter MUST include `snow_depth`, `weather_code`, `precipitation_probability`
- AND the URL MUST include `current_weather=true`
- AND the URL MUST include the `daily` parameter

#### Scenario: Existing params preserved

- GIVEN the URL construction
- WHEN new params are added
- THEN all existing hourly params MUST remain unchanged

### Requirement: Response Type Contract

The `OpenMeteoResponse` type MUST include `current_weather: OpenMeteoCurrentWeather` (optional in response), `daily: OpenMeteoDailyResponse` (optional in response), and existing hourly fields.
(Previously: only hourly fields snow_depth, weather_code, precipitation_probability)

#### Scenario: New response fields

- GIVEN a valid Open-Meteo API response with `current_weather` and `daily`
- WHEN type-checked against `OpenMeteoResponse`
- THEN `current_weather` and `daily` SHALL be typed and accessible

#### Scenario: Missing field protection (backward compat)

- GIVEN an API response without `current_weather` or `daily` (older API version)
- WHEN parsed into TypeScript
- THEN the fields SHALL be typed as optional (`current_weather?: ...`, `daily?: ...`)
- AND the system SHALL handle absence gracefully

### Requirement: Data Semantics

The system MUST document the semantics of each new variable for downstream consumers.

| Variable | Unit | Range | Source | Notes |
|----------|------|-------|--------|-------|
| `snow_depth` | meters | ≥ 0 | ERA5-Land | Relative indicator, may overestimate |
| `weather_code` | WMO code | 0–99 | Open-Meteo | WMO weather interpretation code |
| `precipitation_probability` | % | 0–100 | Open-Meteo | Replaces heuristic snowChance |

#### Scenario: snow_depth treated as relative

- GIVEN a downstream consumer reads `snow_depth`
- WHEN displaying or comparing values
- THEN the system MUST treat it as a relative indicator, not an absolute measurement

### Requirement: Current Weather Fetch

The system MUST include `current_weather=true` in `buildOpenMeteoUrl()`.

#### Scenario: current_weather param in URL

- GIVEN `buildOpenMeteoUrl()` is called with default options
- WHEN the URL is constructed
- THEN the URL MUST include `current_weather=true`
- AND all existing hourly params MUST remain unchanged

#### Scenario: current_weather response parsing

- GIVEN Open-Meteo returns `current_weather` in the response
- WHEN parsed into `OpenMeteoResponse`
- THEN `current_weather` SHALL be typed as `OpenMeteoCurrentWeather`
- AND fields SHALL be: `temperature`, `windspeed`, `winddirection`, `weathercode`, `is_day`, `time`, `interval`

### Requirement: Daily API Fetch

The system MUST include `daily=snowfall_sum,precipitation_sum,temperature_2m_max,temperature_2m_min,precipitation_probability_max` in `buildOpenMeteoUrl()`.

#### Scenario: daily params in URL

- GIVEN `buildOpenMeteoUrl()` is called
- WHEN the URL is constructed
- THEN the URL MUST include the `daily` parameter with all five variables
- AND all existing params MUST remain unchanged

#### Scenario: daily response typed

- GIVEN Open-Meteo returns `daily` in the response
- WHEN parsed into `OpenMeteoResponse`
- THEN `daily` SHALL be typed with `snowfall_sum`, `precipitation_sum`, `temperature_2m_max`, `temperature_2m_min`, `precipitation_probability_max` as `number[]`

### Requirement: AIC Data Pipeline Merge

The system MUST combine AIC yesterday data + Open-Meteo normalized forecast in `weather-source.ts`.

#### Scenario: AIC data merged into NormalizedSnowForecast

- GIVEN AIC data is available and Open-Meteo forecast is available
- WHEN `getWeatherData()` runs
- THEN `NormalizedSnowForecast` SHALL include `yesterday` with AIC station measurements
- AND the pipeline SHALL assign AIC data date as yesterday

#### Scenario: AIC data absent

- GIVEN AIC data is `null` (scraping failed)
- WHEN `getWeatherData()` runs
- THEN the pipeline SHALL proceed without `yesterday`
- AND no error SHALL be thrown

### Requirement: Zone-Hourly Data Pass-Through

`buildZoneHourly()` in `src/pages/lab.astro` MUST return ALL enriched fields from `HourlyForecast`, not a subset. This requirement was added as part of the Lab Pro Dashboard change, originally dropping 7 fields: `windDir`, `cloudCover`, `windGusts`, `humidity`, `snowfall`, `snowDepth`, `weatherCode`.

#### Scenario: Full field pass-through

- GIVEN normalized hourly data has all enriched fields
- WHEN `buildZoneHourly()` maps hourly data
- THEN the returned object SHALL include: `hour`, `temp`, `feels_like`, `wind`, `windDir`, `cloudCover`, `windGusts`, `precip`, `snow_prob`, `freezing_level`, `humidity`, `snowfall`, `snowDepth`, `weatherCode`, `precipitationProbability`

#### Scenario: Zone temperature correction preserved

- GIVEN `buildZoneHourly()` now passes through more fields
- WHEN computing per-zone temperature via lapse rate
- THEN the zone temperature offset logic SHALL remain unchanged
- AND all new fields SHALL use source values directly without zone correction

#### Scenario: Zero and null field handling

- GIVEN a source field is `0` or `null`
- WHEN mapped to the return object
- THEN `0` SHALL pass through as-is, `null` SHALL pass through as `null`
- AND no field SHALL be dropped due to falsy value

### Requirement: Coordinate Alignment

The system MUST update `CAVIAHUE_COORDS` to match the AIC station location: lat -37.86, lon -71.08.

#### Scenario: Coordinates updated

- GIVEN the project constant `CAVIAHUE_COORDS`
- WHEN the build uses Open-Meteo API
- THEN latitude SHALL be -37.86 and longitude SHALL be -71.08
- AND the `name` SHALL remain "Caviahue"
