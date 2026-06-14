# Delta for Weather Data Enrichment

## ADDED Requirements

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

### Requirement: Coordinate Alignment

The system MUST update `CAVIAHUE_COORDS` to match the AIC station location: lat -37.86, lon -71.08.

#### Scenario: Coordinates updated

- GIVEN the project constant `CAVIAHUE_COORDS`
- WHEN the build uses Open-Meteo API
- THEN latitude SHALL be -37.86 and longitude SHALL be -71.08
- AND the `name` SHALL remain "Caviahue"

## MODIFIED Requirements

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
