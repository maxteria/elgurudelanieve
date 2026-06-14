# Delta for weather-normalization

## ADDED Requirements

### Requirement: New Field Pass-Through

The normalization pipeline MUST pass `snow_depth`, `weather_code`, and `precipitation_probability` from the raw `OpenMeteoResponse` into the normalized output types without data loss.

#### Scenario: New fields in NormalizedHourlyForecast

- GIVEN a raw `OpenMeteoResponse` with `snow_depth`, `weather_code`, `precipitation_probability` populated
- WHEN `normalizeOpenMeteoResponse()` maps hourly data
- THEN each `NormalizedHourlyForecast` entry MUST include `snowDepth`, `weatherCode`, `precipitationProbability` with the same values rounded to 1 decimal (numeric fields)

#### Scenario: snowChance field preserved

- GIVEN `NormalizedZoneForecast` currently has `snowChance` from the heuristic
- WHEN the new `precipitationProbability` is available
- THEN `snowChance` MAY remain in the type for backward compatibility, but its value SHOULD come from `precipitationProbability` instead of the heuristic

### Requirement: Type Extension

The `NormalizedHourlyForecast` and `NormalizedZoneForecast` types MUST include the new fields.

| Field | Type | Rounding | Source |
|-------|------|----------|--------|
| `snowDepth` | `number` | 2 decimal | `raw.snow_depth[i]` |
| `weatherCode` | `number` | integer | `raw.weather_code[i]` |
| `precipitationProbability` | `number` | integer | `raw.precipitation_probability[i]` |

#### Scenario: TypeScript strict compliance

- GIVEN the extended types
- WHEN the project is type-checked with `npx astro check`
- THEN zero type errors MUST be reported
