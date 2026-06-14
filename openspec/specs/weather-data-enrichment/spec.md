# Weather Data Enrichment Specification

## Purpose

Defines the fetch shape, response types, and data contract for `snow_depth`, `weather_code`, and `precipitation_probability` variables from the Open-Meteo API.

## Requirements

### Requirement: API Fetch Shape

The system MUST include `snow_depth`, `weather_code`, and `precipitation_probability` in the `hourly` parameter list of `buildOpenMeteoUrl()`.

#### Scenario: New params in URL

- GIVEN `buildOpenMeteoUrl()` is called with default options
- WHEN the URL is constructed
- THEN the `hourly` query parameter MUST include `snow_depth`, `weather_code`, `precipitation_probability`

#### Scenario: Existing params preserved

- GIVEN the URL construction
- WHEN `snow_depth`, `weather_code`, `precipitation_probability` are added
- THEN all existing hourly params MUST remain unchanged

### Requirement: Response Type Contract

The `OpenMeteoResponse.hourly` type MUST include `snow_depth: number[]`, `weather_code: number[]`, and `precipitation_probability: number[]`.

#### Scenario: New fields in response type

- GIVEN a valid Open-Meteo API response
- WHEN type-checked against `OpenMeteoResponse`
- THEN `hourly.snow_depth`, `hourly.weather_code`, `hourly.precipitation_probability` MUST be present as `number[]`

#### Scenario: Missing field protection

- GIVEN an API response missing any new field
- WHEN parsed into `OpenMeteoResponse`
- THEN TypeScript compilation MUST fail (strict type checking)

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
