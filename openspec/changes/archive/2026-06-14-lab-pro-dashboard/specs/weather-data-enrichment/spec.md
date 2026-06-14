# Delta for Weather Data Enrichment

## ADDED Requirements

### Requirement: Zone-Hourly Data Pass-Through

`buildZoneHourly()` in `src/pages/lab.astro` MUST return ALL enriched fields from `HourlyForecast`, not a subset. Currently drops 7 fields: `windDir`, `cloudCover`, `windGusts`, `humidity`, `snowfall`, `snowDepth`, `weatherCode`.

#### Scenario: Full field pass-through

- GIVEN normalized hourly data has all enriched fields
- WHEN `buildZoneHourly()` maps hourly data (lines 118-131)
- THEN the returned object SHALL include: `hour`, `temp`, `feels_like`, `wind`, `windDir`, `cloudCover`, `windGusts`, `precip`, `snow_prob`, `freezing_level`, `humidity`, `snowfall`, `snowDepth`, `weatherCode`, `precipitationProbability`

#### Scenario: Zone temperature correction preserved

- GIVEN `buildZoneHourly()` now passes through more fields
- WHEN computing per-zone temperature via lapse rate
- THEN the zone temperature offset logic (lines 119-121) SHALL remain unchanged
- AND all new fields SHALL use source values directly without zone correction

#### Scenario: Zero and null field handling

- GIVEN a source field is `0` or `null`
- WHEN mapped to the return object
- THEN `0` SHALL pass through as-is, `null` SHALL pass through as `null`
- AND no field SHALL be dropped due to falsy value
